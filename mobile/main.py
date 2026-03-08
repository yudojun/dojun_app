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
        "scope": "조합안",  # ✅ 추가
        "title": "보건휴가 관련 회의",
        "summary": "조합안",
        "company": "회사안 절대 반대",
        "union": "조합안",
    },
    {
        "id": "local_2",
        "scope": "회사안",  # ✅ 추가
        "title": "임금교섭 3차 - 격차 조정 논의",
        "summary": "조합안",
        "company": "격차 해소 + 기본급 조정",
        "union": "",
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

    # 1) scope 기준으로 필터링
    filtered = []
    for row in rows:
        scope = (row.get("scope") or "전체").strip()

        if tab == "회사안" and scope != "회사안":
            continue
        if tab == "조합안" and scope != "조합안":
            continue
        # 전체 탭은 전부 보여주기 -> pass

        filtered.append(row)

    # 2) 정렬 (앱의 sort_mode 기준)
    app = MDApp.get_running_app()
    mode = getattr(app, "sort_mode", "최신순")

    if mode == "최신순":
        # updated_at 우선, 없으면 order로 보조
        filtered.sort(
            key=lambda r: (r.get("updated_at", ""), r.get("order", 0)), reverse=True
        )
    elif mode == "오래된순":
        filtered.sort(
            key=lambda r: (r.get("updated_at", ""), r.get("order", 0)), reverse=False
        )
    elif mode == "가나다순":
        filtered.sort(key=lambda r: (r.get("title") or ""))

    # 3) 기존 방식(tuple)으로 변환해서 반환
    return [
        (
            r.get("id"),  # ✅ 추가
            r.get("title"),
            r.get("summary"),
            r.get("company"),
            r.get("union"),
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

        # ---- 카드 외형 ----
        self.orientation = "vertical"
        self.padding = (dp(18), dp(16))
        self.spacing = dp(10)
        self.radius = [14]
        self.elevation = 1
        self.size_hint_y = None
        self.bind(minimum_height=self.setter("height"))

        # ---- 토글 상태 ----
        self._opened = False

        # =========================
        # 헤더 영역
        # =========================
        header = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(44),
            spacing=dp(10),
        )

        # 왼쪽 아이콘
        header.add_widget(MDIcon(icon="file-document-outline"))

        # 제목
        title_lbl = MDLabel(
            text=self.title,
            bold=True,
            font_name="Nanum",
            valign="middle",
        )
        header.add_widget(title_lbl)

        # ✅ 투표 배지(처음엔 ...)
        self.badge = MDLabel(
            text="…",
            font_name="Nanum",
            font_size="12sp",
            size_hint=(None, None),
            size=(dp(90), dp(24)),
            halign="right",
            valign="middle",
            theme_text_color="Secondary",
        )
        header.add_widget(self.badge)

        # 오른쪽 화살표 버튼
        self.chev = MDIconButton(icon="chevron-down")
        self.chev.on_release = self.toggle
        header.add_widget(self.chev)

        # 헤더를 카드에 추가
        self.add_widget(header)

        # ✅ 배지 내용 비동기 로딩 (헤더 만든 뒤에!)
        issue_id = self.issue_id  # 지역 변수로 따로 빼기 (클로저 문제 방지)
        app = MDApp.get_running_app()

        if issue_id:

            def _apply(summary):
                self.set_badge_summary(summary)

            app.request_vote_summary(issue_id, _apply)
        else:
            self.badge.text = ""

        # =========================
        # 내용 영역 (처음엔 접힘)
        # =========================
        self.content = MDBoxLayout(
            orientation="vertical",
            spacing=dp(10),
            size_hint_y=None,
            height=0,
            opacity=0,
        )

        # 태그
        tag_text = "전체" if self.mode == "전체" else self.mode
        self.content.add_widget(
            MDLabel(
                text=f"[{tag_text}]",
                halign="left",
                size_hint_y=None,
                height=dp(18),
                font_name="Nanum",
                font_size="12sp",
                theme_text_color="Secondary",
            )
        )

        # 요약
        self.content.add_widget(self._section("회의 요약", self.summary))

        if self.mode in ("전체", "회사안"):
            self.content.add_widget(
                self._section("회사 측 입장", self.company or "(내용 없음)")
            )

        if self.mode in ("전체", "조합안"):
            self.content.add_widget(
                self._section("조합 측 입장", self.union or "(내용 없음)")
            )
        # 상세보기 버튼 (여기서 detail로 안전하게 이동)
        btn_row = MDBoxLayout(orientation="horizontal", size_hint_y=None, height=dp(40))
        btn_row.add_widget(MDLabel(text=""))  # 왼쪽 빈 공간(오른쪽 정렬용)

        detail_btn = MDFlatButton(text="자세히 보기")

        def _go_detail(*args):
            issue = {
                "id": self.issue_id,
                "title": self.title,
                "summary": self.summary,
                "company": self.company,
                "union": self.union,
            }
            MDApp.get_running_app().open_detail(issue)

        detail_btn.on_release = _go_detail

        btn_row.add_widget(detail_btn)
        self.content.add_widget(btn_row)

        self.add_widget(self.content)

        # 헤더 높이만큼 collapsed height 잡아두기
        self._collapsed_height = header.height + self.padding[1] * 2 + self.spacing

        Clock.schedule_once(
            lambda dt: setattr(self, "height", self._collapsed_height), 0
        )

    def _section(self, title, body):
        box = MDBoxLayout(orientation="vertical", spacing=dp(4), size_hint_y=None)
        box.bind(minimum_height=box.setter("height"))

        title_label = MDLabel(
            text=f"[b]{title}[/b]",
            markup=True,
            font_name="Nanum",
            font_size="13sp",
            size_hint_y=None,
        )
        title_label.bind(texture_size=title_label.setter("size"))

        body_label = MDLabel(
            text=(body.strip() if body else "(내용 없음)"),
            font_name="Nanum",
            font_size="13sp",
            size_hint_y=None,
            text_size=(
                self.width - dp(40),
                None,
            ),  # 🔥 Window.width 대신 self.width 사용
        )
        body_label.bind(texture_size=body_label.setter("size"))

        box.add_widget(title_label)
        box.add_widget(body_label)

        return box

    def toggle(self, *args):
        ps = self.parent_screen
        if ps is None:
            return

        # 다른 카드가 열려있으면 닫기
        if (
            not self._opened
            and getattr(ps, "opened_card", None)
            and ps.opened_card is not self
        ):
            ps.opened_card.force_close()

        if not self._opened:
            self._opened = True
            self.chev.icon = "chevron-up"

            target_h = self.content.minimum_height
            Animation.cancel_all(self.content)
            Animation.cancel_all(self)

            # content 펼치기
            Animation(height=target_h, opacity=1, d=0.18, t="out_quad").start(
                self.content
            )
            # card 높이 늘리기
            Animation(
                height=self._collapsed_height + target_h, d=0.18, t="out_quad"
            ).start(self)

            ps.opened_card = self
        else:
            self.force_close()

    def force_close(self):
        if not self._opened:
            return

        self._opened = False
        self.chev.icon = "chevron-down"

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
        """배지 텍스트만 즉시 갱신"""
        try:
            self.badge.text = (
                f"찬{summary['yes']} 반{summary['no']} 보{summary['hold']}"
            )
        except Exception as e:
            print("BADGE SET ERROR:", e)


# =============================
# Screens
# =============================
class MainScreen(MDScreen):
    current_tab = "전체"
    opened_card = None
    _last_loaded_tab = None
    card_map = None

    def on_tab_switch(self, *args):
        self.current_tab = args[-1]
        self._last_loaded_tab = None
        self.populate_main_list()

    def on_kv_post(self, base_widget):
        self._last_loaded_tab = None
        self.populate_main_list()

    def populate_main_list(self):
        if self._last_loaded_tab == self.current_tab:
            return

        issues = get_filtered_issues(self.current_tab)

        # ✅ 여기서 비어있으면: 기존 화면 유지하거나, 그때만 empty state 처리
        if not issues:
            # 기존 화면을 유지하고 싶으면 그냥 return
            # return

            # 빈 화면을 보여주고 싶다면 그때만 clear 후 empty state
            issue_list = self.ids.get("issue_list")
            if issue_list:
                issue_list.clear_widgets()
            self._add_empty_state()
            self._last_loaded_tab = self.current_tab
            return

        # ✅ 데이터가 있을 때만 지우고 다시 그림
        issue_list = self.ids.get("issue_list")
        if issue_list:
            issue_list.clear_widgets()

        self.card_map = {}

        self.opened_card = None

        seen = set()
        for issue_id, title, summary, company, union_opt in issues:
            if title in seen:
                continue
            seen.add(title)

            card = ExpandableIssueCard(
                issue_id=issue_id,  # ✅ 추가
                title=title,
                summary=summary,
                company=company,
                union=union_opt,
                parent_screen=self,
                mode=self.current_tab,
            )
            self.ids.issue_list.add_widget(card)

            if issue_id:
                self.card_map[issue_id] = card

        self._last_loaded_tab = self.current_tab

    def _add_empty_state(self):
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

        issue_list = self.ids.get("issue_list")
        if issue_list:
            issue_list.add_widget(card)

        self._last_loaded_tab = self.current_tab

        # (선택) 탭 전환 직후 레이아웃 갱신이 필요할 때만 약간 딜레이로 재빌드
        def _reload(dt):
            self._last_loaded_tab = None
            self.populate_main_list()

        Clock.schedule_once(_reload, 0.05)


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


class IssueDetailScreen(MDScreen):
    def show_issue(self, issue):
        issue_id = (issue or {}).get("id")
        if not issue_id:
            print("ERROR show_issue: issue_id is None. issue =", issue)
            return
        # ✅ 1) 컨테이너 확보
        container = self.ids.detail_container
        container.clear_widgets()

        # ✅ 2) 제목 / 요약
        container.add_widget(
            MDLabel(
                text=issue.get("title", ""),
                font_name="Nanum",
                font_size="20sp",
                bold=True,
                size_hint_y=None,
                height=dp(34),
            )
        )
        container.add_widget(
            MDLabel(
                text=issue.get("summary", ""),
                font_name="Nanum",
                theme_text_color="Secondary",
                size_hint_y=None,
                height=dp(24),
            )
        )

        # ✅ 3) 회사안 카드
        company_txt = issue.get("company", "") or "회사 측 공식 입장 정리 전입니다."
        container.add_widget(
            MDCard(
                MDLabel(
                    text=f"[b]회사안[/b]\n{company_txt}", markup=True, font_name="Nanum"
                ),
                padding=dp(12),
                radius=[12],
                elevation=1,
                size_hint_y=None,
            )
        )

        # ✅ 4) 조합안 카드
        union_txt = issue.get("union", "") or "조합 요구안 정리 중입니다."
        container.add_widget(
            MDCard(
                MDLabel(
                    text=f"[b]조합안[/b]\n{union_txt}", markup=True, font_name="Nanum"
                ),
                padding=dp(12),
                radius=[12],
                elevation=1,
                size_hint_y=None,
            )
        )

        # ✅ 5) 버튼 줄(찬/반/보) — 무조건 추가
        btn_row = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(44),
            spacing=dp(10),
            padding=(0, dp(8)),
        )

        self.btn_yes = MDRaisedButton(text="찬성")
        self.btn_no = MDRaisedButton(text="반대")
        self.btn_hold = MDRaisedButton(text="보류")

        self.btn_yes.on_release = lambda: MDApp.get_running_app().submit_vote(
            issue, "yes"
        )
        self.btn_no.on_release = lambda: MDApp.get_running_app().submit_vote(
            issue, "no"
        )
        self.btn_hold.on_release = lambda: MDApp.get_running_app().submit_vote(
            issue, "hold"
        )

        btn_row.add_widget(self.btn_yes)
        btn_row.add_widget(self.btn_no)
        btn_row.add_widget(self.btn_hold)

        container.add_widget(btn_row)

        # ✅ 6) 내 선택 표시 라벨
        self.my_vote_label = MDLabel(
            text="내 선택: -",
            font_name="Nanum",
            size_hint_y=None,
            height=dp(24),
        )
        container.add_widget(self.my_vote_label)

        # ✅ 투표 현황 라벨 (추가)
        self.vote_summary_label = MDLabel(
            text="투표 현황\n찬성: 0  반대: 0  보류: 0\n총 참여: 0",
            font_name="Nanum",
            size_hint_y=None,
            height=dp(72),
        )
        container.add_widget(self.vote_summary_label)

        # ✅ 투표 그래프 UI 추가
        self.vote_graph = VoteGraphBox()
        container.add_widget(self.vote_graph)

        # ✅ 7) 화면 뜬 뒤(0.1초) 내 선택/색 적용
        def _after(dt):
            app = MDApp.get_running_app()
            choice = None
            try:
                # 네가 이미 만든 함수 이름에 맞춰 쓰면 됨
                choice = app.fetch_my_vote(issue.get("id"))
            except Exception as e:
                print("FETCH_MY_VOTE ERROR:", e)

            if choice:
                self.my_vote_label.text = f"내 선택: { {'yes':'찬성','no':'반대','hold':'보류'}.get(choice, choice) }"
                try:
                    self.highlight_my_choice(choice)
                except Exception as e:
                    print("HIGHLIGHT ERROR:", e)
            MDApp.get_running_app().update_vote_summary(issue)

        Clock.schedule_once(_after, 0.1)

    def highlight_my_choice(self, choice):
        dim_bg = (0.85, 0.85, 0.85, 1)
        active_yes = (0.2, 0.6, 1, 1)
        active_no = (1, 0.3, 0.3, 1)
        active_hold = (0.6, 0.6, 0.6, 1)

        for b in (self.btn_yes, self.btn_no, self.btn_hold):
            b.md_bg_color = dim_bg
            b.text_color = (0, 0, 0, 1)

        if choice == "yes":
            self.btn_yes.md_bg_color = active_yes
            self.btn_yes.text_color = (1, 1, 1, 1)
        elif choice == "no":
            self.btn_no.md_bg_color = active_no
            self.btn_no.text_color = (1, 1, 1, 1)
        elif choice == "hold":
            self.btn_hold.md_bg_color = active_hold
            self.btn_hold.text_color = (1, 1, 1, 1)


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
                MDLabel(text="오류: 쟁점 ID가 없습니다(상세보기 불가)", max_lines=1),
                y="10dp",
                pos_hint={"center_x": 0.5},
                size_hint_x=0.85,
                duration=1.2,
            ).open()
            return

        detail = self.root.get_screen("detail")
        detail.show_issue(issue)
        self.root.current = "detail"

    def submit_vote(self, issue: dict, choice: str):
        issue_id = issue.get("id")
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
        prev_choice = None
        try:
            prev_choice = self.fetch_my_vote(issue_id)  # ✅ 투표 전 내 기존 선택
        except Exception as e:
            print("WARN prev_choice fetch failed:", e)

        print("VOTE:", issue_id, title, "->", choice)

        try:
            # ✅ 앱 시작 때 저장해둔 토큰/uid 재사용
            id_token = getattr(self, "user_id_token", None)
            user_uid = getattr(self, "user_uid", None)

            # 혹시 없으면(처음 로그인 실패 등) 여기서 1번만 재시도
            if not id_token or not user_uid:
                self.user_id_token, self.user_uid = firebase_anonymous_login()
                id_token = self.user_id_token
                user_uid = self.user_uid

            # ✅ Firestore REST 경로 (프로젝트ID는 반드시 실제 값 사용)
            url = (
                "https://firestore.googleapis.com/v1/"
                f"projects/{PROJECT_ID}/databases/(default)/documents/"
                f"votes/{issue_id}/ballots/{user_uid}"
            )

            data = {
                "fields": {
                    "choice": {"stringValue": choice},
                    "issue_title": {"stringValue": title},
                    "created_at": {
                        "timestampValue": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    },
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

                issue_id = issue.get("id")

                # ✅ 1) 배지/집계 캐시 무효화 (한 번만)
                self.invalidate_vote_cache(issue_id)

                # 0) stats 증감 (서버값 갱신)
                self.apply_vote_stats_delta(issue_id, prev_choice, choice)

                # ✅ (중요) 최신 stats를 바로 읽어서 캐시에도 저장해두면 더 즉시 반영됨
                latest = self.fetch_vote_stats(issue_id)
                if not hasattr(self, "vote_cache"):
                    self.vote_cache = {}
                self.vote_cache[issue_id] = latest

                # ✅ 2) 목록 전체 리빌드 대신, 해당 카드 배지 숫자만 즉시 갱신
                Clock.schedule_once(lambda dt: self.update_badge_only(issue_id), 0)

                # ✅ 3) 상세 화면 "내 선택" 갱신
                Clock.schedule_once(lambda dt: self.update_my_vote_label(issue), 0.1)

                # ✅ 4) 상세 화면 "투표 현황(찬/반/보/총참여)" 갱신  ← 여기!!
                Clock.schedule_once(lambda dt: self.update_vote_summary(issue), 0.1)

                # ✅ 5) 버튼 강조(즉시 해도 되고, 0.0~0.1 딜레이도 OK)
                try:
                    detail = self.root.get_screen("detail")
                    detail.highlight_my_choice(choice)
                except Exception as e:
                    print("HIGHLIGHT ERROR:", e)

            else:
                MDSnackbar(
                    MDLabel(
                        text=f"저장 실패: {r.status_code}", max_lines=1, shorten=True
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

            # ✅ 토큰: 둘 중 뭐가 됐든 잡히게(안전장치)
            id_token = getattr(self, "user_id_token", None) or getattr(
                self, "user_id_token", None
            )
            if not id_token:
                print("DEBUG no id_token")
                return

            summary = self.fetch_vote_stats(issue_id)

            detail.vote_summary_label.text = (
                "투표 현황\n"
                f"찬성: {summary['yes']}  반대: {summary['no']}  보류: {summary['hold']}\n"
                f"총 참여: {summary['total']}"
            )

            print("DEBUG graph summary:", summary)

            if hasattr(detail, "vote_graph") and detail.vote_graph:
                detail.vote_graph.set_summary(summary)
            else:
                print("DEBUG vote_graph missing on detail")

        except Exception as e:
            print("VOTE SUMMARY ERROR:", e)

    def fetch_vote_stats(self, issue_id: str) -> dict:
        if not issue_id:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}
        """
        vote_stats/{issue_id} 단일 문서에서 집계 읽기
        """
        id_token = getattr(self, "user_id_token", None)
        if not id_token:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        url = (
            "https://firestore.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/databases/(default)/documents/"
            f"vote_stats/{issue_id}"
        )
        headers = {"Authorization": f"Bearer {id_token}"}
        r = requests.get(url, headers=headers)

        if r.status_code == 404:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}
        if r.status_code != 200:
            print("VOTE_STATS GET ERROR:", r.status_code, r.text)
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        data = r.json()
        f = data.get("fields", {}) or {}

        def iv(key):
            v = (f.get(key) or {}).get("integerValue")
            try:
                return int(v)
            except:
                return 0

        return {
            "yes": iv("yes"),
            "no": iv("no"),
            "hold": iv("hold"),
            "total": iv("total"),
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
