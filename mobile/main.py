import os
import json
import requests
import time
import threading

from kivy.core.text import LabelBase
from kivy.lang import Builder
from kivy.metrics import dp
from kivy.core.window import Window
from kivy.properties import StringProperty
from kivy.animation import Animation
from kivy.utils import platform

from kivymd.app import MDApp
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel, MDIcon
from kivymd.uix.card import MDCard
from kivymd.uix.tab import MDTabsBase
from kivymd.uix.button import MDIconButton, MDFlatButton
from kivymd.uix.menu import MDDropdownMenu
from kivymd.toast import toast
from kivymd.uix.label import MDLabel
from kivymd.uix.snackbar import MDSnackbar
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.progressbar import MDProgressBar
from kivy.uix.image import AsyncImage
from kivy.clock import Clock
from mobile.api_client import fetch_public_issues
from mobile.firestore_client import fetch_remote_version
from mobile.firestore_client import fetch_vote_summary
from dotenv import load_dotenv

load_dotenv("firebase/.env")

API_KEY = os.getenv("API_KEY")
PROJECT_ID = os.getenv("PROJECT_ID")

FIRESTORE_PROJECT_ID = "unionapp-27bbd"
ISSUES_COLLECTION = "issues"

LOCAL_ISSUES = [
    {
        "id": "local_1",
        "type": "vote",
        "status": "open",
        "title": "회사행사 유지",
        "summary": "5월 추진되는 회사 행사 관련 협의",
        "company": "빠른시일내 협의완료",
        "union": "회사측에서 먼저 대안 제시",
    },
    {
        "id": "local_2",
        "type": "notice",
        "status": "open",
        "title": "노조 창립기념일 휴무관련",
        "summary": "휴무 운영 관련 공지입니다.",
        "company": "",
        "union": "",
        "imageUrl": "sample_notice_image",
    },
]
# =============================
# Desktop 개발용 창 크기 고정
# =============================
if platform in ("win", "linux", "macosx"):
    Window.size = (360, 640)
    Window.minimum_width = 360
    Window.minimum_height = 640


# =============================
# 폰트 등록
# =============================
LabelBase.register(
    name="Nanum",
    fn_regular="fonts/NanumGothic.ttf",
    fn_bold="fonts/NanumGothicBold.ttf",
)

# KivyMD 기본 폰트(Roboto)를 나눔으로 덮기
LabelBase.register(
    name="Roboto",
    fn_regular="fonts/NanumGothic.ttf",
    fn_bold="fonts/NanumGothicBold.ttf",
)


# =============================
# 업데이트 내역 JSON (history)
# =============================


def firebase_anonymous_login():
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
    r = requests.post(url, json={"returnSecureToken": True})
    r.raise_for_status()
    data = r.json()
    return data["idToken"], data["localId"]


def version_file_path():
    app = MDApp.get_running_app()
    if app and hasattr(app, "user_data_dir"):
        return os.path.join(app.user_data_dir, "local_version.json")
    return "local_version.json"


def get_local_version():
    path = version_file_path()
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("version", 0)
    except FileNotFoundError:
        return 0
    except Exception:
        return 0


def save_local_version(version):
    path = version_file_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"version": int(version)}, f)


def check_update_available():
    local_v = get_local_version()
    remote_v = fetch_remote_version()
    return remote_v > local_v


def get_filtered_issues(tab="전체"):
    rows = LOCAL_ISSUES

    filtered = []
    for row in rows:
        issue_type = (row.get("type") or "vote").strip().lower()

        if tab == "공지" and issue_type != "notice":
            continue
        if tab == "투표" and issue_type != "vote":
            continue
        if tab == "설문" and issue_type != "survey":
            continue

        filtered.append(row)

    app = MDApp.get_running_app()
    mode = getattr(app, "sort_mode", "최신순")

    if mode == "최신순":
        filtered.sort(
            key=lambda r: (r.get("updated_at", ""), r.get("order", 0)),
            reverse=True,
        )
    elif mode == "오래된순":
        filtered.sort(
            key=lambda r: (r.get("updated_at", ""), r.get("order", 0)),
            reverse=False,
        )
    elif mode == "가나다순":
        filtered.sort(key=lambda r: (r.get("title") or ""))

    return [
        (
            r.get("id"),
            r.get("title"),
            r.get("summary"),
            r.get("company"),
            r.get("union"),
            r.get("type", "vote"),
            r.get("status", "open"),
            r.get("imageUrl", ""),
        )
        for r in filtered
    ]


# =============================
# Tabs용 클래스
# =============================
class Tab(MDBoxLayout, MDTabsBase):
    pass


# =============================
# 카드(펼침 UI)
# =============================
class ExpandableIssueCard(MDCard):
    def __init__(
        self,
        issue_id,
        title,
        summary,
        company,
        union,
        parent_screen,
        mode="전체",
        issue_type="vote",
        status="open",
        image_url="",
        **kwargs,
    ):
        super().__init__(**kwargs)

        self.issue_id = issue_id
        self.title = title
        self.summary = summary
        self.company = company
        self.union = union
        self.parent_screen = parent_screen
        self.mode = mode
        self.issue_type = issue_type
        self.status = status
        self.image_url = image_url or ""

        # ---- 카드 기본 외형 ----
        self.orientation = "vertical"
        self.padding = (dp(18), dp(16))
        self.spacing = dp(12)
        self.radius = [18]
        self.elevation = 1
        self.size_hint_y = None
        self.md_bg_color = (1, 1, 1, 1)
        self.bind(minimum_height=self.setter("height"))

        self._opened = False

        # =========================
        # 헤더 영역 (2줄 구조)
        # =========================
        header_box = MDBoxLayout(
            orientation="vertical",
            spacing=dp(4),
            size_hint_y=None,
        )
        header_box.bind(minimum_height=header_box.setter("height"))

        # ---------- 1줄 (아이콘 + 제목 + 화살표) ----------
        top_row = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(28),
            spacing=dp(8),
        )

        icon = MDIcon(
            icon="file-document-outline",
            theme_text_color="Custom",
            text_color=(0.13, 0.58, 0.92, 1),
            size_hint_x=None,
            width=dp(22),
        )

        self.title_lbl = MDLabel(
            text=self.title,
            font_name="Nanum",
            bold=True,
            font_size="15sp",
            halign="left",
            valign="middle",
            shorten=True,
        )

        self.chev = MDIconButton(
            icon="chevron-down",
            theme_icon_color="Custom",
            icon_color=(0.35, 0.35, 0.35, 1),
            size_hint_x=None,
            width=dp(36),
        )
        self.chev.bind(on_release=self.toggle)

        top_row.add_widget(icon)
        top_row.add_widget(self.title_lbl)
        top_row.add_widget(self.chev)

        type_map = {
            "notice": "공지",
            "vote": "투표",
            "survey": "설문",
        }
        status_map = {
            "draft": "준비중",
            "review": "검토중",
            "open": "진행중",
            "closed": "종료",
            "archived": "보관",
        }

        status_color_map = {
            "draft": (0.45, 0.45, 0.45, 1),  # 회색
            "review": (0.82, 0.56, 0.12, 1),  # 주황
            "open": (0.18, 0.65, 0.28, 1),  # 초록
            "closed": (0.85, 0.20, 0.20, 1),  # 빨강
            "archived": (0.40, 0.40, 0.40, 1),  # 진회색
        }

        meta_row = MDBoxLayout(
            orientation="horizontal",
            spacing=dp(4),
            size_hint_y=None,
            height=dp(18),
        )

        self.type_label = MDLabel(
            text=type_map.get(self.issue_type, "안건"),
            font_name="Nanum",
            font_size="12sp",
            theme_text_color="Secondary",
            halign="left",
            size_hint_x=None,
            width=dp(34),
        )

        self.dot_label = MDLabel(
            text="·",
            font_name="Nanum",
            font_size="12sp",
            theme_text_color="Secondary",
            halign="center",
            size_hint_x=None,
            width=dp(10),
        )

        self.status_label = MDLabel(
            text=status_map.get(self.status, "진행중"),
            font_name="Nanum",
            font_size="12sp",
            theme_text_color="Custom",
            text_color=status_color_map.get(self.status, (0.35, 0.35, 0.35, 1)),
            halign="left",
        )

        meta_row.add_widget(self.type_label)
        meta_row.add_widget(self.dot_label)
        meta_row.add_widget(self.status_label)

        # ---------- 2줄 (투표 현황) ----------
        self.badge = MDLabel(
            text="…",
            font_name="Nanum",
            font_size="11sp",
            theme_text_color="Custom",
            text_color=(0.45, 0.45, 0.45, 1),
            halign="left",
            size_hint_y=None,
            height=dp(18),
            opacity=0.95,
            shorten=True,
            shorten_from="right",
        )

        # -----------참여자수 추가-------------

        self.participant_label = MDLabel(
            text="👥 참여 0명",
            font_name="Nanum",
            font_size="11sp",
            theme_text_color="Custom",
            text_color=(0.45, 0.45, 0.45, 1),
            halign="left",
            size_hint_y=None,
            height=dp(18),
            opacity=0.95,
        )

        header_box.add_widget(top_row)
        header_box.add_widget(meta_row)

        if self.issue_type == "notice":
            self.notice_preview = self._build_notice_preview()
            header_box.add_widget(self.notice_preview)
        else:
            header_box.add_widget(self.badge)
            header_box.add_widget(self.participant_label)
        self.add_widget(header_box)

        # 구분선
        self.divider = MDBoxLayout(
            size_hint_y=None,
            height=dp(1),
            md_bg_color=(0.88, 0.90, 0.93, 1),
            opacity=0,
        )
        self.add_widget(self.divider)

        # ✅ 배지 로딩
        issue_id = self.issue_id
        app = MDApp.get_running_app()

        if issue_id:

            def _apply(summary):
                self.set_badge_summary(summary)

            app.request_vote_summary(issue_id, _apply)
        else:
            self.badge.text = ""

        # =========================
        # 펼침 내용 영역
        # =========================
        self.content = MDBoxLayout(
            orientation="vertical",
            spacing=dp(12),
            size_hint_y=None,
            height=0,
            opacity=0,
        )

        if self.issue_type == "notice":
            self.content.add_widget(self._section("공지 내용", self.summary or "(내용 없음)"))
        else:
            self.content.add_widget(self._section("회의 요약", self.summary))

            if self.mode in ("전체", "회사안"):
                self.content.add_widget(
                    self._section("회사 측 입장", self.company or "(내용 없음)")
                )

            if self.mode in ("전체", "조합안"):
                self.content.add_widget(
                    self._section("조합 측 입장", self.union or "(내용 없음)")
                )

        btn_row = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(40),
            padding=(0, dp(4), 0, 0),
        )
        btn_row.add_widget(MDLabel(text=""))

        detail_btn = MDFlatButton(
            text="자세히 보기",
            font_name="Nanum",
            theme_text_color="Custom",
            text_color=(0.13, 0.58, 0.92, 1),
        )

        def _go_detail(*args):
            issue = {
                "id": self.issue_id,
                "title": self.title,
                "summary": self.summary,
                "company": self.company,
                "union": self.union,
            }
            MDApp.get_running_app().open_detail(issue)

        detail_btn.bind(on_release=_go_detail)

        btn_row.add_widget(detail_btn)
        self.content.add_widget(btn_row)

        self.add_widget(self.content)

        def _set_collapsed_height(dt):
            self._collapsed_height = (
                header_box.height
                + self.divider.height
                + self.padding[1] * 2
                + self.spacing
            )
            self.height = self._collapsed_height

        Clock.schedule_once(_set_collapsed_height, 0)

    def _section(self, title, body):
        box = MDBoxLayout(
            orientation="vertical",
            spacing=dp(8),
            size_hint_y=None,
        )
        box.bind(minimum_height=box.setter("height"))

        # 섹션 색상 설정
        if "회사" in title:
            color = (0.85, 0.2, 0.2, 1)  # 빨강
        elif "조합" in title:
            color = (0.13, 0.58, 0.92, 1)  # 파랑
        else:
            color = (0.35, 0.35, 0.35, 1)  # 회색

        title_label = MDLabel(
            text=title,
            font_name="Nanum",
            font_size="13sp",
            bold=True,
            theme_text_color="Custom",
            text_color=color,
            size_hint_y=None,
            height=dp(20),
        )

        body_label = MDLabel(
            text=f"• {body.strip()}" if body else "• (내용 없음)",
            font_name="Nanum",
            font_size="15sp",
            theme_text_color="Primary",
            size_hint_y=None,
            halign="left",
            valign="top",
        )

        def _update_body_height(*args):
            body_label.text_size = (self.width - dp(56), None)
            body_label.texture_update()
            body_label.height = body_label.texture_size[1]

        self.bind(width=lambda *args: _update_body_height())
        Clock.schedule_once(lambda dt: _update_body_height(), 0)

        box.add_widget(title_label)
        box.add_widget(body_label)
        return box

    def toggle(self, *args):
        ps = self.parent_screen
        if ps is None:
            return

        if (
            not self._opened
            and getattr(ps, "opened_card", None)
            and ps.opened_card is not self
        ):
            ps.opened_card.force_close()

        if not self._opened:
            self._opened = True
            self.chev.icon = "chevron-up"
            self.divider.opacity = 1
            self.elevation = 3

            target_h = self.content.minimum_height
            Animation.cancel_all(self.content)
            Animation.cancel_all(self)

            Animation(height=target_h, opacity=1, d=0.18, t="out_quad").start(
                self.content
            )
            Animation(
                height=self._collapsed_height + target_h,
                d=0.18,
                t="out_quad",
            ).start(self)

            ps.opened_card = self
        else:
            self.force_close()

    def force_close(self):
        if not self._opened:
            return

        self._opened = False
        self.chev.icon = "chevron-down"
        self.divider.opacity = 0
        self.elevation = 1

        Animation.cancel_all(self.content)
        Animation.cancel_all(self)

        Animation(height=0, opacity=0, d=0.14, t="out_quad").start(self.content)
        Animation(height=self._collapsed_height, d=0.14, t="out_quad").start(self)

        if self.parent_screen:
            self.parent_screen.opened_card = None

    def _open_detail(self, *args):
        issue = {
            "id": self.issue_id,
            "title": self.title,
            "summary": self.summary,
            "company": self.company,
            "union": self.union,
        }
        MDApp.get_running_app().open_detail(issue)

    def set_badge_summary(self, summary: dict):
        try:
            if self.issue_type == "notice":
                return

            options = summary.get("options") or []
            total = int(summary.get("total", 0) or 0)

            if options:
                parts = [f"{item.get('label', '항목')} {item.get('count', 0)}" for item in options]
                self.badge.text = " | ".join(parts)
            else:
                yes = int(summary.get("yes", 0) or 0)
                no = int(summary.get("no", 0) or 0)
                hold = int(summary.get("hold", 0) or 0)
                self.badge.text = f"찬성 {yes} | 반대 {no} | 보류 {hold}"
                if total == 0:
                    total = int(summary.get("total", yes + no + hold) or 0)

            self.participant_label.text = f"👥 참여 {total}명"

        except Exception as e:
            print("BADGE SET ERROR:", e)
            if self.issue_type != "notice":
                self.badge.text = "결과 정보 없음"
                self.participant_label.text = "👥 참여 0명"

    def _build_notice_preview(self):
        box = MDBoxLayout(
            orientation="vertical",
            spacing=dp(6),
            size_hint_y=None,
        )
        box.bind(minimum_height=box.setter("height"))

        summary_text = (self.summary or "공지 내용이 없습니다.").strip()

        summary_label = MDLabel(
            text=summary_text,
            font_name="Nanum",
            font_size="14sp",
            theme_text_color="Custom",
            text_color=(0.25, 0.25, 0.25, 1),
            size_hint_y=None,
            halign="left",
            valign="top",
            max_lines=2,
            shorten=True,
            shorten_from="right",
        )

        def _update_summary_height(*args):
            summary_label.text_size = (self.width - dp(56), None)
            summary_label.texture_update()
            summary_label.height = min(summary_label.texture_size[1], dp(42))

        self.bind(width=lambda *args: _update_summary_height())
        Clock.schedule_once(lambda dt: _update_summary_height(), 0)

        box.add_widget(summary_label)

        if self.image_url:
            image_hint = MDLabel(
                text="🖼 이미지 있음",
                font_name="Nanum",
                font_size="12sp",
                theme_text_color="Custom",
                text_color=(0.13, 0.58, 0.92, 1),
                size_hint_y=None,
                height=dp(18),
            )
            box.add_widget(image_hint)

        return box

# =============================
# Screens
# =============================
class MainScreen(MDScreen):
    current_tab = "전체"
    opened_card = None
    _last_loaded_tab = None
    card_map = None

    def on_kv_post(self, base_widget):
        self._last_loaded_tab = None
        self.update_tab_ui()
        self.populate_main_list()

    def set_tab(self, tab_name):
        if self.current_tab == tab_name:
            return
        self.current_tab = tab_name
        self._last_loaded_tab = None
        self.update_tab_ui()
        self.populate_main_list()

    def update_tab_ui(self):
        tab_ids = {
            "전체": "tab_all",
            "공지": "tab_notice",
            "투표": "tab_vote",
            "설문": "tab_survey",
        }

        active_bg = (0.13, 0.58, 0.92, 1)
        inactive_bg = (1, 1, 1, 1)
        active_text = (1, 1, 1, 1)
        inactive_text = (0.25, 0.25, 0.25, 1)

        for tab_name, widget_id in tab_ids.items():
            btn = self.ids.get(widget_id)
            if not btn:
                continue

            if tab_name == self.current_tab:
                btn.md_bg_color = active_bg
                btn.text_color = active_text
            else:
                btn.md_bg_color = inactive_bg
                btn.text_color = inactive_text

    def populate_main_list(self):
        if self._last_loaded_tab == self.current_tab:
            return

        issues = get_filtered_issues(self.current_tab)

        if not issues:
            issue_list = self.ids.get("issue_list")
            if issue_list:
                issue_list.clear_widgets()
            self._add_empty_state()
            self._last_loaded_tab = self.current_tab
            return

        issue_list = self.ids.get("issue_list")
        if issue_list:
            issue_list.clear_widgets()

        self.card_map = {}
        self.opened_card = None

        seen = set()
        for issue_id, title, summary, company, union_opt, issue_type, status, image_url in issues:
            if title in seen:
                continue
            seen.add(title)

            card = ExpandableIssueCard(
                issue_id=issue_id,
                title=title,
                summary=summary,
                company=company,
                union=union_opt,
                parent_screen=self,
                mode=self.current_tab,
                issue_type=issue_type,
                status=status,
                image_url=image_url,
            )
            self.ids.issue_list.add_widget(card)

            if issue_id:
                self.card_map[issue_id] = card

        self._last_loaded_tab = self.current_tab

    def _add_empty_state(self):
        issue_list = self.ids.get("issue_list")
        if not issue_list:
            return

        issue_list.clear_widgets()

        card = MDCard(
            orientation="vertical",
            padding=(dp(20), dp(20)),
            radius=[14],
            elevation=0,
            md_bg_color=(0.96, 0.96, 0.96, 1),
            size_hint_y=None,
        )
        card.bind(minimum_height=card.setter("height"))

        card.add_widget(
            MDLabel(
                text="📭 현재 등록된 쟁점이 없습니다",
                font_name="Nanum",
                halign="center",
                theme_text_color="Secondary",
                size_hint_y=None,
                height=dp(32),
            )
        )

        issue_list.add_widget(card)
        self._last_loaded_tab = self.current_tab


class UpdateHistoryScreen(MDScreen):
    def on_enter(self):
        container = self.ids.history_container
        container.clear_widgets()

        card = MDCard(
            orientation="vertical",
            padding=dp(14),
            spacing=dp(8),
            radius=[12],
            elevation=1,
            md_bg_color=(1, 1, 1, 1),
            size_hint_y=None,
        )
        card.bind(minimum_height=card.setter("height"))

        header = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(44),
            padding=(dp(12), 0),
        )

        remote_v = fetch_remote_version()

        header_label = MDLabel(
            text=f"[b]버전 {remote_v} 업데이트[/b]",
            markup=True,
            font_name="Nanum",
            font_size="16sp",
            valign="middle",
        )

        header.add_widget(header_label)
        card.add_widget(header)

        content = MDBoxLayout(
            orientation="vertical",
            padding=(dp(16), dp(8)),
            spacing=dp(6),
            size_hint_y=None,
        )
        content.bind(minimum_height=content.setter("height"))

        content.add_widget(
            MDLabel(
                text="• 주요 쟁점 내용이 업데이트되었습니다.",
                font_name="Nanum",
                size_hint_y=None,
            )
        )

        card.add_widget(content)
        container.add_widget(card)


class VoteGraphBox(MDBoxLayout):
    """
    찬성/반대/보류 막대 그래프 UI
    summary = {"yes":int, "no":int, "hold":int, "total":int}
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.orientation = "vertical"
        self.spacing = dp(6)
        self.size_hint_y = None
        self.bind(minimum_height=self.setter("height"))

        # 제목
        self.title_lbl = MDLabel(
            text="[b]투표 그래프[/b]",
            markup=True,
            font_name="Nanum",
            size_hint_y=None,
            height=dp(24),
        )
        self.add_widget(self.title_lbl)

        # 3줄(찬/반/보)
        self.row_yes = self._make_row("찬성")
        self.row_no = self._make_row("반대")
        self.row_hold = self._make_row("보류")

        self.add_widget(self.row_yes["box"])
        self.add_widget(self.row_no["box"])
        self.add_widget(self.row_hold["box"])

        # 초기값
        self.set_summary({"yes": 0, "no": 0, "hold": 0, "total": 0})

    def _make_row(self, label_text: str):
        box = MDBoxLayout(
            orientation="horizontal",
            spacing=dp(8),
            size_hint_y=None,
            height=dp(24),
        )

        lbl = MDLabel(
            text=label_text,
            font_name="Nanum",
            size_hint_x=None,
            width=dp(44),
            halign="left",
            valign="middle",
        )

        bar = MDProgressBar(
            value=0,
            max=100,
        )

        val = MDLabel(
            text="0 (0%)",
            font_name="Nanum",
            size_hint_x=None,
            width=dp(90),
            halign="right",
            valign="middle",
            theme_text_color="Secondary",
        )

        box.add_widget(lbl)
        box.add_widget(bar)
        box.add_widget(val)

        return {"box": box, "lbl": lbl, "bar": bar, "val": val}

    def set_summary(self, summary: dict):
        yes = int(summary.get("yes", 0) or 0)
        no = int(summary.get("no", 0) or 0)
        hold = int(summary.get("hold", 0) or 0)
        total = int(summary.get("total", 0) or 0)

        def pct(n):
            if total <= 0:
                return 0
            return int(round((n / total) * 100))

        self._apply_row(self.row_yes, yes, pct(yes))
        self._apply_row(self.row_no, no, pct(no))
        self._apply_row(self.row_hold, hold, pct(hold))

    def _apply_row(self, row, count: int, percent: int):
        row["bar"].value = percent
        row["val"].text = f"{count} ({percent}%)"


class OptionResultBox(MDBoxLayout):
    """
    옵션 기반 결과 표시 UI
    summary 예시:
    {
        "total": 12,
        "options": [
            {"label": "찬성", "count": 7},
            {"label": "반대", "count": 3},
            {"label": "보류", "count": 2},
        ]
    }
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.orientation = "vertical"
        self.spacing = dp(8)
        self.size_hint_y = None
        self.bind(minimum_height=self.setter("height"))

        self.rows_box = MDBoxLayout(
            orientation="vertical",
            spacing=dp(8),
            size_hint_y=None,
        )
        self.rows_box.bind(minimum_height=self.setter("height"))
        self.add_widget(self.rows_box)

    def _make_row(self, label_text: str, count: int, percent: int):
        row = MDBoxLayout(
            orientation="horizontal",
            spacing=dp(8),
            size_hint_y=None,
            height=dp(24),
        )

        lbl = MDLabel(
            text=label_text,
            font_name="Nanum",
            size_hint_x=None,
            width=dp(92),
            halign="left",
            valign="middle",
        )

        bar = MDProgressBar(
            value=percent,
            max=100,
        )

        val = MDLabel(
            text=f"{count} ({percent}%)",
            font_name="Nanum",
            size_hint_x=None,
            width=dp(92),
            halign="right",
            valign="middle",
            theme_text_color="Secondary",
        )

        row.add_widget(lbl)
        row.add_widget(bar)
        row.add_widget(val)
        return row

    def set_summary(self, summary: dict):
        self.rows_box.clear_widgets()

        options = summary.get("options") or []
        total = int(summary.get("total", 0) or 0)

        if not options:
            self.rows_box.add_widget(
                MDLabel(
                    text="표시할 결과가 없습니다.",
                    font_name="Nanum",
                    theme_text_color="Secondary",
                    size_hint_y=None,
                    height=dp(24),
                )
            )
            return

        for item in options:
            label = str(item.get("label", "항목"))
            count = int(item.get("count", 0) or 0)
            percent = 0 if total <= 0 else int(round((count / total) * 100))
            self.rows_box.add_widget(self._make_row(label, count, percent))


class IssueDetailScreen(MDScreen):
    current_issue = None
    selected_options = None
    option_buttons = None

    def _make_text_card(self, title, body_text):
        card = MDCard(
            orientation="vertical",
            padding=dp(12),
            radius=[12],
            elevation=1,
            size_hint_y=None,
        )
        card.bind(minimum_height=card.setter("height"))

        label = MDLabel(
            text=f"[b]{title}[/b]\n{body_text}",
            markup=True,
            font_name="Nanum",
            size_hint_y=None,
            halign="left",
            valign="top",
        )

        def _update_height(*args):
            label.text_size = (card.width - dp(24), None)
            label.texture_update()
            label.height = label.texture_size[1]

        card.bind(width=lambda *args: _update_height())
        label.bind(
            texture_size=lambda *args: setattr(label, "height", label.texture_size[1])
        )

        Clock.schedule_once(lambda dt: _update_height(), 0)
        card.add_widget(label)
        return card

    def _make_status_badge(self, issue_type, status):
        type_map = {
            "notice": "공지",
            "vote": "투표",
            "survey": "설문",
        }
        status_map = {
            "draft": "준비중",
            "review": "검토중",
            "open": "진행중",
            "closed": "종료",
            "archived": "보관",
        }

        box = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(28),
            spacing=dp(8),
        )

        type_color = {
            "notice": (0.13, 0.58, 0.92, 1),
            "vote": (0.18, 0.65, 0.28, 1),
            "survey": (0.48, 0.34, 0.84, 1),
        }.get(issue_type, (0.35, 0.35, 0.35, 1))

        status_color = {
            "draft": (0.45, 0.45, 0.45, 1),
            "review": (0.75, 0.55, 0.1, 1),
            "open": (0.15, 0.65, 0.25, 1),
            "closed": (0.85, 0.2, 0.2, 1),
            "archived": (0.4, 0.4, 0.4, 1),
        }.get(status, (0.35, 0.35, 0.35, 1))

        type_label = MDLabel(
            text=f"[b]{type_map.get(issue_type, issue_type)}[/b]",
            markup=True,
            font_name="Nanum",
            theme_text_color="Custom",
            text_color=type_color,
            size_hint_x=None,
            width=dp(56),
        )

        dot_label = MDLabel(
            text="·",
            font_name="Nanum",
            theme_text_color="Secondary",
            size_hint_x=None,
            width=dp(12),
            halign="center",
        )

        status_label = MDLabel(
            text=f"[b]{status_map.get(status, status)}[/b]",
            markup=True,
            font_name="Nanum",
            theme_text_color="Custom",
            text_color=status_color,
            halign="left",
        )

        box.add_widget(type_label)
        box.add_widget(dot_label)
        box.add_widget(status_label)
        return box

    def _make_section_title(self, text):
        return MDLabel(
            text=text,
            font_name="Nanum",
            font_size="15sp",
            bold=True,
            theme_text_color="Custom",
            text_color=(0.15, 0.15, 0.15, 1),
            size_hint_y=None,
            height=dp(28),
        )

    def _format_created_at(self, issue):
        raw = (
            issue.get("created_at")
            or issue.get("updated_at")
            or issue.get("startAt")
            or ""
        )
        if not raw:
            return "작성일 정보 없음"
        return raw.replace("T", " ").replace("Z", "")

    def _build_notice_detail(self, container, issue):
        container.add_widget(self._make_section_title("공지 내용"))

        image_url = (issue.get("imageUrl") or "").strip()
        if image_url:
            if image_url.startswith("http://") or image_url.startswith("https://"):
                image_card = MDCard(
                    orientation="vertical",
                    padding=dp(8),
                    radius=[12],
                    elevation=1,
                    size_hint_y=None,
                    height=dp(220),
                )
                image_card.add_widget(
                    AsyncImage(
                        source=image_url,
                        allow_stretch=True,
                        keep_ratio=True,
                    )
                )
                container.add_widget(image_card)
            else:
                container.add_widget(
                    MDCard(
                        MDLabel(
                            text="🖼 공지 이미지가 등록되어 있습니다.",
                            font_name="Nanum",
                            halign="center",
                        ),
                        padding=dp(16),
                        radius=[12],
                        elevation=1,
                        size_hint_y=None,
                        height=dp(72),
                    )
                )

        body_text = (
            issue.get("content")
            or issue.get("summary")
            or "공지 본문이 없습니다."
        )

        body_label = MDLabel(
            text=body_text,
            font_name="Nanum",
            font_size="15sp",
            theme_text_color="Custom",
            text_color=(0.2, 0.2, 0.2, 1),
            size_hint_y=None,
            halign="left",
            valign="top",
        )

        def _update_body_height(*args):
            body_label.text_size = (container.width - dp(32), None)
            body_label.texture_update()
            body_label.height = body_label.texture_size[1]

        container.bind(width=lambda *args: _update_body_height())
        Clock.schedule_once(lambda dt: _update_body_height(), 0)

        container.add_widget(body_label)

    def _clear_selection(self):
        self.selected_options = []
        self.option_buttons = {}

    def _toggle_option(self, option_value):
        if not self.current_issue:
            return

        issue = self.current_issue
        multiple = bool(issue.get("multiple", False))
        max_sel = int(issue.get("maxSelections", 1) or 1)

        if option_value in self.selected_options:
            self.selected_options.remove(option_value)
        else:
            if multiple:
                if len(self.selected_options) >= max_sel:
                    MDSnackbar(
                        MDLabel(
                            text=f"최대 {max_sel}개까지 선택할 수 있습니다",
                            font_name="Nanum",
                            max_lines=1,
                        ),
                        y="10dp",
                        pos_hint={"center_x": 0.5},
                        size_hint_x=0.85,
                        duration=1.2,
                    ).open()
                    return
                self.selected_options.append(option_value)
            else:
                self.selected_options = [option_value]

        self.refresh_option_buttons()

    def refresh_option_buttons(self):
        active_bg = (0.13, 0.58, 0.92, 1)
        inactive_bg = (1, 1, 1, 1)
        active_text = (1, 1, 1, 1)
        inactive_text = (0.2, 0.2, 0.2, 1)

        for option_value, btn in (self.option_buttons or {}).items():
            if option_value in self.selected_options:
                btn.md_bg_color = active_bg
                btn.text_color = active_text
            else:
                btn.md_bg_color = inactive_bg
                btn.text_color = inactive_text

    def _build_option_selector(self, issue):
        options = issue.get("options") or []
        if not options:
            return None

        wrapper = MDBoxLayout(
            orientation="vertical",
            spacing=dp(10),
            size_hint_y=None,
        )
        wrapper.bind(minimum_height=wrapper.setter("height"))

        type_text = "복수 선택 가능" if issue.get("multiple") else "하나만 선택"
        if issue.get("multiple"):
            max_sel = int(issue.get("maxSelections", 1) or 1)
            helper = f"{type_text} (최대 {max_sel}개)"
        else:
            helper = type_text

        wrapper.add_widget(
            MDLabel(
                text=helper,
                font_name="Nanum",
                theme_text_color="Secondary",
                size_hint_y=None,
                height=dp(20),
            )
        )

        self._clear_selection()

        for option in options:
            btn = MDFlatButton(
                text=str(option),
                font_name="Nanum",
                theme_text_color="Custom",
                text_color=(0.2, 0.2, 0.2, 1),
                md_bg_color=(1, 1, 1, 1),
                size_hint_y=None,
                height=dp(42),
            )
            btn.bind(on_release=lambda instance, value=option: self._toggle_option(value))
            self.option_buttons[option] = btn
            wrapper.add_widget(btn)

        return wrapper

    def _build_result_area(self, container):
        self.vote_summary_label = MDLabel(
            text="결과 불러오는 중...",
            font_name="Nanum",
            size_hint_y=None,
            height=dp(56),
        )
        container.add_widget(self.vote_summary_label)

        self.result_box = OptionResultBox()
        container.add_widget(self.result_box)

    def _build_my_response_area(self, container):
        self.my_vote_label = MDLabel(
            text="내 응답: 없음",
            font_name="Nanum",
            size_hint_y=None,
            height=dp(24),
        )
        container.add_widget(self.my_vote_label)

    def _build_submit_area(self, container, issue):
        can_submit, reason = MDApp.get_running_app().can_submit_issue(issue)

        if not can_submit:
            container.add_widget(
                MDLabel(
                    text=reason,
                    font_name="Nanum",
                    theme_text_color="Custom",
                    text_color=(0.85, 0.2, 0.2, 1),
                    size_hint_y=None,
                    height=dp(24),
                )
            )
            return

        self.submit_btn = MDRaisedButton(
            text="응답 제출",
            font_name="Nanum",
        )
        self.submit_btn.bind(
            on_release=lambda *args: MDApp.get_running_app().submit_ballot(issue)
        )

        row = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(44),
        )
        row.add_widget(MDLabel(text=""))
        row.add_widget(self.submit_btn)
        container.add_widget(row)

    def get_selected_options(self):
        return list(self.selected_options or [])

    def apply_my_ballot(self, ballot):
        selected = ballot.get("selectedOptions") or []
        self.selected_options = list(selected)
        self.refresh_option_buttons()

        if hasattr(self, "my_vote_label") and self.my_vote_label:
            if selected:
                self.my_vote_label.text = f"내 응답: {', '.join(selected)}"
            else:
                self.my_vote_label.text = "내 응답: 없음"

    def show_issue(self, issue):
        issue_id = (issue or {}).get("id")
        if not issue_id:
            print("ERROR show_issue: issue_id is None. issue =", issue)
            return

        self.current_issue = issue

        container = self.ids.detail_container
        container.clear_widgets()

        title_label = MDLabel(
            text=issue.get("title", ""),
            font_name="Nanum",
            font_size="20sp",
            bold=True,
            size_hint_y=None,
            height=dp(34),
        )
        container.add_widget(title_label)

        container.add_widget(
            self._make_status_badge(
                issue.get("type", "vote"),
                issue.get("status", "open"),
            )
        )

        container.add_widget(
            MDLabel(
                text=self._format_created_at(issue),
                font_name="Nanum",
                theme_text_color="Secondary",
                size_hint_y=None,
                height=dp(22),
            )
        )

        summary_text = issue.get("summary", "") or "안건 요약이 없습니다."
        container.add_widget(
            MDLabel(
                text=summary_text,
                font_name="Nanum",
                theme_text_color="Secondary",
                size_hint_y=None,
                height=dp(24),
            )
        )

        issue_type = issue.get("type", "vote")

        if issue_type == "notice":
            self._build_notice_detail(container, issue)
            return

        company_txt = issue.get("company", "")
        union_txt = issue.get("union", "")

        if company_txt:
            container.add_widget(self._make_text_card("회사안", company_txt))
        if union_txt:
            container.add_widget(self._make_text_card("조합안", union_txt))

        container.add_widget(self._make_section_title("응답 항목"))

        option_selector = self._build_option_selector(issue)
        if option_selector:
            container.add_widget(option_selector)
        else:
            container.add_widget(
                MDLabel(
                    text="선택 가능한 항목이 없습니다.",
                    font_name="Nanum",
                    theme_text_color="Secondary",
                    size_hint_y=None,
                    height=dp(24),
                )
            )

        self._build_submit_area(container, issue)
        self._build_my_response_area(container)

        if MDApp.get_running_app().should_show_results(issue):
            container.add_widget(self._make_section_title("결과"))
            self._build_result_area(container)

        def _after(dt):
            app = MDApp.get_running_app()

            try:
                ballot = app.fetch_my_ballot(issue.get("id"))
                self.apply_my_ballot(ballot or {})
            except Exception as e:
                print("FETCH_MY_BALLOT ERROR:", e)

            try:
                if app.should_show_results(issue):
                    app.update_vote_summary(issue)
            except Exception as e:
                print("UPDATE_RESULT ERROR:", e)

        Clock.schedule_once(_after, 0.1)

# =============================
# App
# =============================
class MainApp(MDApp):
    sort_mode = "최신순"  # 기본값: 최신순
    sort_menu = None

    def open_sort_menu(self, caller):
        items = [
            {"text": "최신순", "on_release": lambda: self.set_sort_mode("최신순")},
            {"text": "오래된순", "on_release": lambda: self.set_sort_mode("오래된순")},
            {"text": "가나다순", "on_release": lambda: self.set_sort_mode("가나다순")},
        ]

        if self.sort_menu:
            self.sort_menu.dismiss()

        self.sort_menu = MDDropdownMenu(
            caller=caller,
            items=items,
            width_mult=3.5,
        )
        self.sort_menu.open()

    def set_sort_mode(self, mode):
        self.sort_mode = mode
        if self.sort_menu:
            self.sort_menu.dismiss()
        main = self.root.get_screen("main")
        main._last_loaded_tab = None
        main.populate_main_list()

    def build(self):
        kv_path = os.path.join(os.path.dirname(__file__), "dojun.kv")
        return Builder.load_file(kv_path)

    def on_start(self):
        # ✅ 앱 시작 시 1번만 로그인
        try:
            id_token, uid = firebase_anonymous_login()
            self.user_id_token = id_token
            self.user_uid = uid
            print("LOGIN OK:", uid)
        except Exception as e:
            print("LOGIN ERROR:", e)
            self.user_id_token = None
            self.user_uid = None

        # 기존 초기 로직
        self.refresh_issues()
        self.update_dot_state()

    def stop_update_dot_animation(self):
        main = self.root.get_screen("main")
        dot = main.ids.update_dot
        Animation.cancel_all(dot)
        dot.opacity = 0

    def update_dot_state(self):
        # remote_version은 이미 fetch_remote_version()으로 가져오고 있지?
        try:
            remote_v = fetch_remote_version()
        except Exception:
            remote_v = 0

        local_v = get_local_version()

        if remote_v > local_v:
            self.start_update_dot_animation()
        else:
            self.stop_update_dot_animation()

    _refreshing = False

    def refresh_issues(self, *args):
        # ✅ 연타 방지
        if self._refreshing:
            print("INFO: refresh ignored (already refreshing)")
            return
        self._refreshing = True

        def _do_refresh(dt):
            global LOCAL_ISSUES
            try:
                id_token = getattr(self, "user_id_token", None)

                if not id_token:
                    self.user_id_token, self.user_uid = firebase_anonymous_login()
                    id_token = self.user_id_token

                print("AUTH used uid:", getattr(self, "user_uid", None))

                fetched = fetch_public_issues(id_token)
                print("DEBUG fetched count:", len(fetched))

                if fetched:
                    LOCAL_ISSUES = fetched
                else:
                    print("WARN: fetched empty -> keep LOCAL_ISSUES")

            except Exception as e:
                print("ERROR refresh_issues:", e)

            # ✅ UI 갱신은 마지막에
            try:
                main = self.root.get_screen("main")
                main._last_loaded_tab = None
                main.populate_main_list()
            except Exception as e:
                print("ERROR UI update after refresh:", e)

            self._refreshing = False

        # ✅ UI 이벤트(버튼 클릭) 처리 끝난 다음 프레임에 실행
        Clock.schedule_once(_do_refresh, 0)
        MDSnackbar(
            MDLabel(
                text="업데이트 완료",
                font_name="Nanum",
                font_size="13sp",  # ✅ 이거 추가
                max_lines=1,
                shorten=True,
                theme_text_color="Custom",
                text_color=(1, 1, 1, 1),
            ),
            y="10dp",
            pos_hint={"center_x": 0.5},
            size_hint_x=0.85,
            duration=1.2,
        ).open()

    def go_history(self):
        # 히스토리 들어가면 최신 버전 읽음 처리
        try:
            remote_v = fetch_remote_version()
            save_local_version(remote_v)
        except Exception:
            pass

        self.update_dot_state()
        self.root.current = "history"

    def go_main(self):
        self.root.current = "main"
        self.update_dot_state()

    def open_detail(self, issue: dict):
        issue_id = (issue or {}).get("id")
        if not issue_id:
            print("ERROR open_detail: issue_id is None. issue =", issue)
            MDSnackbar(
                MDLabel(text="오류: 안건 ID가 없습니다", max_lines=1),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        try:
            remote_issue = self.fetch_public_issue_detail(issue_id)
            if remote_issue:
                issue = {**issue, **remote_issue}
        except Exception as e:
            print("FETCH_PUBLIC_ISSUE_DETAIL ERROR:", e)

        detail = self.root.get_screen("detail")
        detail.show_issue(issue)
        self.root.current = "detail"

    def fetch_public_issue_detail(self, issue_id: str) -> dict:
        id_token = getattr(self, "user_id_token", None)
        if not id_token or not issue_id:
            return {}

        url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents/"
            f"issues_public/{issue_id}"
        )
        headers = {"Authorization": f"Bearer {id_token}"}
        r = requests.get(url, headers=headers)

        if r.status_code != 200:
            print("PUBLIC ISSUE DETAIL ERROR:", r.status_code, r.text)
            return {}

        data = r.json()
        fields = data.get("fields", {}) or {}

        def s(key, default=""):
            return (fields.get(key) or {}).get("stringValue", default)

        def b(key, default=False):
            return (fields.get(key) or {}).get("booleanValue", default)

        def i(key, default=0):
            v = (fields.get(key) or {}).get("integerValue")
            try:
                return int(v)
            except Exception:
                return default

        def ts(key):
            return (fields.get(key) or {}).get("timestampValue", "")

        def arr(key):
            values = ((fields.get(key) or {}).get("arrayValue") or {}).get("values", [])
            return [v.get("stringValue", "") for v in values]

        return {
            "id": issue_id,
            "title": s("title"),
            "summary": s("summary"),
            "content": s("content"),  # ✅ 공지 상세 본문
            "category": s("category"),
            "scope": s("scope"),
            "status": s("status", "open"),
            "type": s("type", "vote"),
            "resultVisibility": s("resultVisibility", "public"),
            "company": s("company"),
            "union": s("union"),
            "multiple": b("multiple", False),
            "maxSelections": i("maxSelections", 1),
            "options": arr("options"),
            "startAt": ts("startAt"),
            "endAt": ts("endAt"),
            "created_at": ts("created_at"),
            "updated_at": ts("updated_at"),
            "imageUrl": s("imageUrl", ""),
        }

    def can_submit_issue(self, issue: dict):
        status = (issue.get("status") or "").strip().lower()
        issue_type = (issue.get("type") or "").strip().lower()

        if issue_type == "notice":
            return False, "공지형 안건은 응답 대상이 아닙니다."

        if status == "draft":
            return False, "아직 공개 전 안건입니다."
        if status == "review":
            return False, "검토 중인 안건입니다."
        if status == "closed":
            return False, "종료된 안건입니다."
        if status == "archived":
            return False, "보관된 안건입니다."

        return True, ""

    def should_show_results(self, issue: dict):
        visibility = (issue.get("resultVisibility") or "public").strip().lower()
        status = (issue.get("status") or "").strip().lower()

        if visibility == "admin_only":
            return False
        if visibility == "after_close":
            return status == "closed"
        return True

    def fetch_my_ballot(self, issue_id: str):
        id_token = getattr(self, "user_id_token", None)
        user_uid = getattr(self, "user_uid", None)

        if not id_token or not user_uid or not issue_id:
            return None

        url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents/"
            f"votes/{issue_id}/ballots/{user_uid}"
        )

        headers = {"Authorization": f"Bearer {id_token}"}
        r = requests.get(url, headers=headers)

        if r.status_code != 200:
            return None

        data = r.json()
        fields = data.get("fields", {}) or {}

        def s(key, default=""):
            return (fields.get(key) or {}).get("stringValue", default)

        def arr(key):
            values = ((fields.get(key) or {}).get("arrayValue") or {}).get("values", [])
            return [v.get("stringValue", "") for v in values]

        return {
            "uid": s("uid"),
            "issueId": s("issueId"),
            "type": s("type"),
            "selectedOptions": arr("selectedOptions"),
            "submittedAt": s("submittedAt"),
            "updatedAt": s("updatedAt"),
        }

    def submit_ballot(self, issue: dict):
        issue_id = issue.get("id")
        if not issue_id:
            MDSnackbar(
                MDLabel(text="오류: 안건 ID가 없습니다", max_lines=1),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        can_submit, reason = self.can_submit_issue(issue)
        if not can_submit:
            MDSnackbar(
                MDLabel(text=reason, font_name="Nanum", max_lines=1),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        detail = self.root.get_screen("detail")
        selected_options = detail.get_selected_options()

        if not selected_options:
            MDSnackbar(
                MDLabel(
                    text="응답 항목을 선택해 주세요", font_name="Nanum", max_lines=1
                ),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        multiple = bool(issue.get("multiple", False))
        max_sel = int(issue.get("maxSelections", 1) or 1)

        if (not multiple) and len(selected_options) != 1:
            MDSnackbar(
                MDLabel(
                    text="하나만 선택할 수 있습니다", font_name="Nanum", max_lines=1
                ),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        if multiple and len(selected_options) > max_sel:
            MDSnackbar(
                MDLabel(
                    text=f"최대 {max_sel}개까지 선택할 수 있습니다",
                    font_name="Nanum",
                    max_lines=1,
                ),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        try:
            id_token = getattr(self, "user_id_token", None)
            user_uid = getattr(self, "user_uid", None)

            if not id_token or not user_uid:
                self.user_id_token, self.user_uid = firebase_anonymous_login()
                id_token = self.user_id_token
                user_uid = self.user_uid

            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ")

            url = (
                "https://firestore.googleapis.com/v1/"
                f"projects/{PROJECT_ID}/databases/(default)/documents/"
                f"votes/{issue_id}/ballots/{user_uid}"
            )

            data = {
                "fields": {
                    "uid": {"stringValue": user_uid},
                    "issueId": {"stringValue": issue_id},
                    "type": {"stringValue": issue.get("type", "vote")},
                    "selectedOptions": {
                        "arrayValue": {
                            "values": [
                                {"stringValue": str(v)} for v in selected_options
                            ]
                        }
                    },
                    "submittedAt": {"timestampValue": now_iso},
                    "updatedAt": {"timestampValue": now_iso},
                }
            }

            headers = {
                "Authorization": f"Bearer {id_token}",
                "Content-Type": "application/json",
            }

            r = requests.patch(url, headers=headers, json=data)
            print("BALLOT SAVE:", r.status_code, r.text)

            if r.status_code in (200, 201):
                MDSnackbar(
                    MDLabel(text="응답 저장 완료", font_name="Nanum", max_lines=1),
                    y="10dp",
                    pos_hint={"center_x": 0.5},
                    size_hint_x=0.85,
                    duration=1.0,
                ).open()

                try:
                    ballot = self.fetch_my_ballot(issue_id)
                    detail.apply_my_ballot(ballot or {})
                except Exception as e:
                    print("APPLY MY BALLOT ERROR:", e)

                if self.should_show_results(issue):
                    Clock.schedule_once(lambda dt: self.update_vote_summary(issue), 0.1)

                Clock.schedule_once(lambda dt: self.update_badge_only(issue_id), 0.1)

            else:
                MDSnackbar(
                    MDLabel(
                        text=f"저장 실패: {r.status_code}",
                        font_name="Nanum",
                        max_lines=1,
                    ),
                    y="10dp",
                    pos_hint={"center_x": 0.5},
                    size_hint_x=0.85,
                    duration=1.2,
                ).open()

        except Exception as e:
            print("SUBMIT BALLOT ERROR:", e)
            MDSnackbar(
                MDLabel(text="응답 저장 중 오류", font_name="Nanum", max_lines=1),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()

    def submit_vote(self, issue: dict, choice: str):
        issue_id = issue.get("id")
        issue_type = issue.get("type", "vote")
        title = issue.get("title", "")

        if not issue_id:
            print("ERROR: issue_id is None. issue =", issue)
            MDSnackbar(
                MDLabel(text="오류: 쟁점 ID가 없습니다(저장 불가)", max_lines=1),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        print("VOTE:", issue_id, title, "->", choice)

        try:
            id_token = getattr(self, "user_id_token", None)
            user_uid = getattr(self, "user_uid", None)

            if not id_token or not user_uid:
                self.user_id_token, self.user_uid = firebase_anonymous_login()
                id_token = self.user_id_token
                user_uid = self.user_uid

            url = (
                "https://firestore.googleapis.com/v1/"
                f"projects/{PROJECT_ID}/databases/(default)/documents/"
                f"votes/{issue_id}/ballots/{user_uid}"
            )

            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ")

            data = {
                "fields": {
                    "uid": {"stringValue": user_uid},
                    "issueId": {"stringValue": issue_id},
                    "type": {"stringValue": issue_type},
                    "selectedOptions": {
                        "arrayValue": {"values": [{"stringValue": choice}]}
                    },
                    "submittedAt": {"timestampValue": now_iso},
                    "updatedAt": {"timestampValue": now_iso},
                    "departmentId": {"nullValue": None},
                    "memberId": {"nullValue": None},
                }
            }

            headers = {
                "Authorization": f"Bearer {id_token}",
                "Content-Type": "application/json",
            }

            r = requests.patch(url, headers=headers, json=data)
            print("VOTE SAVE:", r.status_code, r.text)

            if r.status_code in (200, 201):
                MDSnackbar(
                    MDLabel(text="투표 저장 완료", max_lines=1),
                    y="10dp",
                    pos_hint={"center_x": 0.5},
                    size_hint_x=0.85,
                    duration=1.0,
                ).open()

                # 1) 캐시 무효화
                self.invalidate_vote_cache(issue_id)

                # 2) 서버가 계산한 최신 결과 다시 읽기
                try:
                    latest = self.fetch_vote_stats(issue_id)
                    if not hasattr(self, "vote_cache"):
                        self.vote_cache = {}
                    self.vote_cache[issue_id] = latest
                except Exception as e:
                    print("FETCH LATEST VOTE_STATS ERROR:", e)

                # 3) 화면 갱신
                Clock.schedule_once(lambda dt: self.update_badge_only(issue_id), 0)
                Clock.schedule_once(lambda dt: self.update_my_vote_label(issue), 0.1)
                Clock.schedule_once(lambda dt: self.update_vote_summary(issue), 0.1)

                try:
                    detail = self.root.get_screen("detail")
                    detail.highlight_my_choice(choice)
                except Exception as e:
                    print("HIGHLIGHT ERROR:", e)

            else:
                MDSnackbar(
                    MDLabel(
                        text=f"저장 실패: {r.status_code}",
                        max_lines=1,
                        shorten=True,
                    ),
                    y="10dp",
                    pos_hint={"center_x": 0.5},
                    size_hint_x=0.85,
                    duration=1.2,
                ).open()

        except Exception as e:
            print("VOTE ERROR:", e)
            MDSnackbar(
                MDLabel(text="투표 저장 중 오류", max_lines=1, shorten=True),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()

    def fetch_vote_summary(self, issue_id: str):
        """
        votes/{issueId}/ballots 전체 문서를 읽어서
        choice yes/no/hold 카운트를 반환
        """
        id_token = getattr(self, "user_id_token", None)
        if not id_token:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents/"
            f"votes/{issue_id}/ballots"
        )
        headers = {"Authorization": f"Bearer {id_token}"}

        r = requests.get(url, headers=headers)
        if r.status_code != 200:
            print("VOTE SUMMARY ERROR:", r.status_code, r.text)
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        data = r.json()
        docs = data.get("documents", []) or []

        yes = no = hold = 0
        for doc in docs:
            fields = doc.get("fields", {}) or {}
            choice = (fields.get("choice", {}) or {}).get("stringValue", "")
            if choice == "yes":
                yes += 1
            elif choice == "no":
                no += 1
            elif choice == "hold":
                hold += 1

        total = yes + no + hold
        return {"yes": yes, "no": no, "hold": hold, "total": total}

    def update_vote_summary_ui(self, issue: dict):
        """상세 화면에 집계 표시 업데이트"""
        try:
            issue_id = issue.get("id")
            detail = self.root.get_screen("detail")

            summary = self.fetch_vote_summary(issue_id)

            # detail 화면에 만들어둔 라벨 업데이트
            if hasattr(detail, "vote_summary_label") and detail.vote_summary_label:
                detail.vote_summary_label.text = (
                    f"[b]투표 현황[/b]\n"
                    f"찬성: {summary['yes']}    반대: {summary['no']}    보류: {summary['hold']}\n"
                    f"총 참여: {summary['total']}"
                )

            # ✅ 그래프도 같이 갱신
            if hasattr(detail, "vote_graph") and detail.vote_graph:
                detail.vote_graph.set_summary(summary)
            else:
                print("DEBUG: vote_graph not found on detail")

        except Exception as e:
            print("ERROR update_vote_summary_ui:", e)

    def get_vote_summary_cached(self, issue_id: str):
        # 캐시 딕셔너리 없으면 생성
        if not hasattr(self, "vote_cache"):
            self.vote_cache = {}
        return self.vote_cache.get(issue_id)

    def request_vote_summary(self, issue_id: str, on_done):
        if not issue_id:
            Clock.schedule_once(
                lambda dt: on_done({"yes": 0, "no": 0, "hold": 0, "total": 0}), 0
            )
            return
        """
        issue_id에 대한 투표 현황을 백그라운드(thread)로 불러와서
        UI 스레드에서 on_done(summary_dict) 호출
        summary_dict = {"yes": int, "no": int, "hold": int, "total": int}
        """
        cached = self.get_vote_summary_cached(issue_id)
        if cached is not None:
            Clock.schedule_once(lambda dt: on_done(cached), 0)
            return

        def worker():
            try:
                # ✅ ballots 전부 읽는 방식 X  -> stats 문서 1개 읽는 방식 O
                summary = self.fetch_vote_stats(issue_id)
            except Exception as e:
                print("ERROR request_vote_summary:", e)
                summary = {"yes": 0, "no": 0, "hold": 0, "total": 0}

            if not hasattr(self, "vote_cache"):
                self.vote_cache = {}
            self.vote_cache[issue_id] = summary

            Clock.schedule_once(lambda dt: on_done(summary), 0)

        threading.Thread(target=worker, daemon=True).start()

    def invalidate_vote_cache(self, issue_id: str):
        """투표 직후 해당 이슈 캐시만 날려서 새로 읽게 함"""
        if hasattr(self, "vote_cache") and issue_id in self.vote_cache:
            del self.vote_cache[issue_id]

    def refresh_list_only(self):
        try:
            main = self.root.get_screen("main")
            main._last_loaded_tab = None
            main.populate_main_list()
        except Exception as e:
            print("ERROR refresh_list_only:", e)

    def fetch_my_vote(self, issue_id: str):
        id_token = getattr(self, "user_id_token", None)
        user_uid = getattr(self, "user_uid", None)

        if not id_token or not user_uid:
            return None

        url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents/"
            f"votes/{issue_id}/ballots/{user_uid}"
        )

        headers = {"Authorization": f"Bearer {id_token}"}
        r = requests.get(url, headers=headers)

        if r.status_code != 200:
            return None

        data = r.json()
        fields = data.get("fields", {})
        return fields.get("choice", {}).get("stringValue")

    def update_my_vote_label(self, issue: dict):
        try:
            detail = self.root.get_screen("detail")
            choice = self.fetch_my_vote(issue.get("id"))

            if not hasattr(detail, "my_vote_label"):
                return

            if choice == "yes":
                txt = "찬성"
            elif choice == "no":
                txt = "반대"
            elif choice == "hold":
                txt = "보류"
            else:
                txt = "없음"

            detail.my_vote_label.text = f"[b]내 선택:[/b] {txt}"
            detail.my_vote_label.markup = True

        except Exception as e:
            print("ERROR update_my_vote_label:", e)

    def update_vote_summary(self, issue: dict):
        try:
            detail = self.root.get_screen("detail")
            if not hasattr(detail, "vote_summary_label"):
                return

            issue_id = issue.get("id")
            if not issue_id:
                return

            status = (issue.get("status") or "").strip().lower()

            # 준비중/검토중은 결과 숨김
            if status in ("draft", "review"):
                detail.vote_summary_label.text = (
                    "결과는 안건 공개 후 확인할 수 있습니다."
                )
                if hasattr(detail, "result_box") and detail.result_box:
                    detail.result_box.set_summary({"total": 0, "options": []})
                return

            # 공개 정책 확인
            if not self.should_show_results(issue):
                detail.vote_summary_label.text = "결과가 아직 공개되지 않았습니다."
                if hasattr(detail, "result_box") and detail.result_box:
                    detail.result_box.set_summary({"total": 0, "options": []})
                return

            summary = self.fetch_vote_stats(issue_id)
            total = int(summary.get("total", 0) or 0)
            options = summary.get("options") or []

            if options:
                line_text = " / ".join(
                    [
                        f"{item.get('label', '항목')}: {item.get('count', 0)}"
                        for item in options
                    ]
                )
                detail.vote_summary_label.text = (
                    "결과 현황\n" f"{line_text}\n" f"총 참여: {total}"
                )
            else:
                detail.vote_summary_label.text = "아직 집계된 결과가 없습니다."

            if hasattr(detail, "result_box") and detail.result_box:
                detail.result_box.set_summary(summary)

        except Exception as e:
            print("VOTE SUMMARY ERROR:", e)

    def fetch_vote_stats(self, issue_id: str) -> dict:
        if not issue_id:
            return {"total": 0, "options": []}

        id_token = getattr(self, "user_id_token", None)
        if not id_token:
            return {"total": 0, "options": []}

        url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents/"
            f"vote_stats/{issue_id}"
        )
        headers = {"Authorization": f"Bearer {id_token}"}
        r = requests.get(url, headers=headers)

        if r.status_code == 404:
            return {"total": 0, "options": []}

        if r.status_code != 200:
            print("VOTE_STATS GET ERROR:", r.status_code, r.text)
            return {"total": 0, "options": []}

        data = r.json()
        f = data.get("fields", {}) or {}

        def iv(key, default=0):
            v = (f.get(key) or {}).get("integerValue")
            try:
                return int(v)
            except:
                return default

        # 1) 새 구조: optionCounts(map) 우선 지원
        option_counts_field = (f.get("optionCounts") or {}).get("mapValue", {})
        option_counts_map = option_counts_field.get("fields", {}) or {}

        if option_counts_map:
            options = []
            total = 0

            for key, value in option_counts_map.items():
                count = 0
                try:
                    count = int(value.get("integerValue", 0))
                except:
                    count = 0
                options.append({"label": key, "count": count})
                total += count

            return {
                "total": total,
                "options": options,
            }

        # 2) 레거시 yes/no/hold 구조 fallback
        yes = iv("yes")
        no = iv("no")
        hold = iv("hold")
        total = iv("total", yes + no + hold)

        return {
            "total": total,
            "options": [
                {"label": "찬성", "count": yes},
                {"label": "반대", "count": no},
                {"label": "보류", "count": hold},
            ],
        }

    def apply_vote_stats_delta(
        self, issue_id: str, prev_choice: str | None, new_choice: str
    ):
        """
        prev_choice -> new_choice 로 바뀔 때 vote_stats/{issue_id}를 증감한다.
        - 처음 투표면 total +1
        - 기존 투표 변경이면 total 변화 없음
        """
        id_token = getattr(self, "user_id_token", None)
        if not id_token:
            return

        # 변화 없으면 아무것도 안 함
        if prev_choice == new_choice:
            return

        # 델타 계산
        delta = {"yes": 0, "no": 0, "hold": 0, "total": 0}
        if new_choice in delta:
            delta[new_choice] += 1

        if prev_choice in delta:
            delta[prev_choice] -= 1

        # 처음 참여면 total +1
        if prev_choice is None:
            delta["total"] += 1

        # vote_stats 문서가 없으면 0으로 생성(1회)
        stats_url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents/"
            f"vote_stats/{issue_id}"
        )
        headers = {
            "Authorization": f"Bearer {id_token}",
            "Content-Type": "application/json",
        }

        # 404면 기본값 생성
        r0 = requests.get(stats_url, headers={"Authorization": f"Bearer {id_token}"})
        if r0.status_code == 404:
            base = {
                "fields": {
                    "yes": {"integerValue": "0"},
                    "no": {"integerValue": "0"},
                    "hold": {"integerValue": "0"},
                    "total": {"integerValue": "0"},
                }
            }
            requests.patch(stats_url, headers=headers, json=base)

        # Firestore commit(증감 transform)
        commit_url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents:commit"
        )

        def inc_field(field, n):
            return {"fieldPath": field, "increment": {"integerValue": str(n)}}

        transforms = []
        for k, n in delta.items():
            if n != 0:
                transforms.append(inc_field(k, n))

        if not transforms:
            return

        body = {
            "writes": [
                {
                    "transform": {
                        "document": f"projects/{PROJECT_ID}/databases/(default)/documents/vote_stats/{issue_id}",
                        "fieldTransforms": transforms,
                    }
                }
            ]
        }

        rc = requests.post(commit_url, headers=headers, json=body)
        if rc.status_code != 200:
            print("VOTE_STATS COMMIT ERROR:", rc.status_code, rc.text)

    def update_badge_only(self, issue_id: str):
        """목록 전체 리빌드 없이, 해당 카드 배지만 즉시 갱신"""
        try:
            main = self.root.get_screen("main")
            if not getattr(main, "card_map", None):
                return

            card = main.card_map.get(issue_id)
            if not card:
                return

            # 캐시 무효화 후 최신 stats 읽어서 배지에 적용
            self.invalidate_vote_cache(issue_id)

            def _apply(summary):
                card.set_badge_summary(summary)

            self.request_vote_summary(issue_id, _apply)

        except Exception as e:
            print("update_badge_only ERROR:", e)


if __name__ == "__main__":
    MainApp().run()
