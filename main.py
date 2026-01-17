import os
import json

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
from kivy.clock import Clock
from firestore_client import fetch_issues
from firestore_client import fetch_remote_version

FIRESTORE_PROJECT_ID = "unionapp"
ISSUES_COLLECTION = "issues"

LOCAL_ISSUES = [
    {
        "title": "보건휴가 관련 회의",
        "summary": "조합안",
        "company": "회사안 절대 반대",
        "union": "조합안",
    },
    {
        "title": "임금교섭 3차 - 격차 조정 논의",
        "summary": "조합안",
        "company": "",
        "union": "격차 해소 + 기본급 조정",
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

LOCAL_VERSION_FILE = "local_version.json"


def get_local_version():
    try:
        with open(LOCAL_VERSION_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("version", 0)
    except FileNotFoundError:
        return 0


def save_local_version(version):
    with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump({"version": version}, f)


def check_update_available():
    local_v = get_local_version()
    remote_v = fetch_remote_version()
    return remote_v > local_v


def get_filtered_issues(tab="전체"):
    rows = LOCAL_ISSUES

    def match(row):
        if tab == "회사안":
            return bool(row.get("company"))
        if tab == "조합안":
            return bool(row.get("union"))
        return True

    return [
        (
            row.get("title"),
            row.get("summary"),
            row.get("company"),
            row.get("union"),
        )
        for row in rows
        if match(row)
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
        self, title, summary, company, union, parent_screen, mode="전체", **kwargs
    ):
        super().__init__(**kwargs)

        self._content_built = False
        self.size_hint_y = None
        self.bind(minimum_height=self.setter("height"))

        # 🔥 여기 핵심 수정
        self.issue = {
            "title": title,
            "summary": summary,
            "company": company,
            "union": union,  # ✅
        }

        self.mode = mode
        self.title = title or ""
        self.summary = summary or ""
        self.company = company or ""
        self.union = union or ""  # ✅

        self.orientation = "vertical"
        self.padding = (dp(18), dp(16))
        self.radius = [14]
        self.elevation = 1

        # 헤더 (이건 이미 잘 돼 있음)
        header = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None,
            height=dp(44),
            spacing=dp(10),
        )
        header.add_widget(MDIcon(icon="file-document-outline"))
        header.add_widget(MDLabel(text=self.title, bold=True))
        self.add_widget(header)

        if not self._content_built:
            # 내용
            self.content = MDBoxLayout(
                orientation="vertical",
                spacing=dp(10),
                size_hint_y=None,
                opacity=1,
            )

            tag_text = "조합안" if self.mode == "조합안" else "회사안"

            tag = MDLabel(
                text=f"[{tag_text}]",
                halign="left",
                size_hint_y=None,
                height=dp(20),
                font_size="12sp",
                color=(0.2, 0.5, 0.9, 1),
            )
            self.content.add_widget(tag)

            summary_title = MDLabel(
                text="[b]회의 요약[/b]",
                markup=True,
                font_size="12sp",
                size_hint_y=None,
                color=(0.5, 0.5, 0.5, 1),
            )
            self.content.add_widget(summary_title)

            company_title = MDLabel(
                text="[b]회사 측 입장[/b]",
                markup=True,
                font_size="13sp",
                size_hint_y=None,
            )
            company_body = MDLabel(
                text=self.company,
                font_size="13sp",
                size_hint_y=None,
                text_size=(Window.width - dp(64), None),
            )
            company_body.bind(texture_size=company_body.setter("size"))
            self.content.add_widget(company_title)
            self.content.add_widget(company_body)

            union_title = MDLabel(
                text="[b]조합 측 입장[/b]",
                markup=True,
                font_size="13sp",
                size_hint_y=None,
                color=(0.2, 0.5, 0.9, 1),
            )
            union_body = MDLabel(
                text=self.union,
                font_size="14sp",
                bold=True,
                size_hint_y=None,
                text_size=(Window.width - dp(64), None),
            )
            union_body.bind(texture_size=union_body.setter("size"))
            self.content.add_widget(union_title)
            self.content.add_widget(union_body)

            self.content.bind(minimum_height=self.content.setter("height"))

            self.add_widget(self.content)

            self._content_built = True  # 🔥 이 줄이 핵심

    # =========================
    # 공통 섹션 생성기
    # =========================
    def _section(self, title, body):
        box = MDBoxLayout(orientation="vertical", spacing=dp(4), size_hint_y=None)
        box.bind(minimum_height=box.setter("height"))

        box.add_widget(
            MDLabel(
                text=title,
                bold=True,
                font_name="Nanum",
                font_size="14sp",
                size_hint_y=None,
                height=dp(18),
            )
        )

        box.add_widget(
            MDLabel(
                text=body.strip() if body else "(내용 없음)",
                font_name="Nanum",
                line_height=1.35,
                size_hint_y=None,
            )
        )
        return box

    # =========================
    # 🔽 여기부터가 3번 핵심
    # =========================
    def _build_all_view(self):
        self.content.add_widget(self._section("핵심 요약", self.summary))

    def _build_company_view(self):
        text = self.company if self.company else "회사 측 공식 입장 정리 전입니다."
        self.content.add_widget(self._section("회사 측 입장", text))

    def _build_union_view(self):
        text = self.union_opt if self.union_opt else "조합 요구안 정리 중입니다."
        self.content.add_widget(self._section("조합 요구", text))

    # =========================
    # 토글 로직
    # =========================
    def toggle(self, *args): ...

    def toggle(self, *args):
        ps = self.parent_screen
        if ps is None:
            return

        if not self._opened:
            if ps.opened_card and ps.opened_card is not self:
                ps.opened_card.force_close()

            self._opened = True
            self.chev.icon = "chevron-up"

            target_h = self.content.minimum_height

            self.content.opacity = 0
            self.content.height = 0

            Animation(height=target_h, opacity=1, d=0.18, t="out_quad").start(
                self.content
            )
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

        Animation(height=0, opacity=0, d=0.14, t="out_quad").start(self.content)
        Animation(height=self._collapsed_height, d=0.14, t="out_quad").start(self)

        if self.parent_screen:
            self.parent_screen.opened_card = None


# =============================
# Screens
# =============================
class MainScreen(MDScreen):
    current_tab = "전체"
    opened_card = None
    _last_loaded_tab = None

    def on_tab_switch(self, *args):
        self.current_tab = args[-1]
        MDApp.get_running_app().refresh_issues()

    def on_kv_post(self, base_widget):
        self._last_loaded_tab = None
        self.populate_main_list()

    def populate_main_list(self):
        if not hasattr(self, "_debug_printed"):
            print("DEBUG current_tab:", self.current_tab)
            print("DEBUG issues:", get_filtered_issues(self.current_tab))
            self._debug_printed = True

        if self._last_loaded_tab == self.current_tab:
            return

        issue_list = self.ids.get("issue_list")
        if issue_list:
            issue_list.clear_widgets()

        self.opened_card = None

        issues = get_filtered_issues(self.current_tab)

        if not issues:
            self._add_empty_state()
            self._last_loaded_tab = self.current_tab
            return

        seen = set()
        for title, summary, company, union_opt in issues:
            if title in seen:
                continue
            seen.add(title)

            card = ExpandableIssueCard(
                title=title,
                summary=summary,
                company=company,
                union=union_opt,
                parent_screen=self,
                mode=self.current_tab,
            )
            self.ids.issue_list.add_widget(card)

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
        self.ids.issue_list.add_widget(card)

        self._last_loaded_tab = self.current_tab

        def on_tab_switch(self, tabs, tab, tab_label, tab_text):
            self.current_tab = tab_text
            self._last_loaded_tab = None
            self.populate_main_list()

        def _reload(dt):
            self._last_loaded_tab = None
            self.populate_main_list()

        Clock.schedule_once(_reload, 0.08)


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


class IssueDetailScreen(MDScreen):
    def show_issue(self, issue):
        container = self.ids.detail_container
        container.clear_widgets()

        # 제목
        container.add_widget(
            MDLabel(
                text=issue.get("title", ""),
                font_name="Nanum",
                font_size="20sp",
                bold=True,
                size_hint_y=None,
            )
        )

        # 요약
        container.add_widget(
            MDLabel(
                text=issue.get("summary", ""),
                font_name="Nanum",
                size_hint_y=None,
            )
        )

        # 회사안
        if issue.get("company"):
            container.add_widget(
                MDCard(
                    MDLabel(text=f"[b]회사안[/b]\n{issue['company']}", markup=True),
                    padding=dp(12),
                )
            )

        # 조합안
        if issue.get("union"):
            container.add_widget(
                MDCard(
                    MDLabel(text=f"[b]조합안[/b]\n{issue['union']}", markup=True),
                    padding=dp(12),
                )
            )


# =============================
# App
# =============================
class MainApp(MDApp):
    def build(self):
        return Builder.load_file("dojun.kv")

    def on_start(self):
        # 탭 구성 (KV에서 텅 비어있으니 여기서 생성)
        main = self.root.get_screen("main")

    def start_update_dot_animation(self):
        main = self.root.get_screen("main")
        dot = main.ids.update_dot
        dot.opacity = 1
        Animation.cancel_all(dot)
        anim = Animation(opacity=0.3, d=0.8) + Animation(opacity=1, d=0.8)
        anim.repeat = True
        anim.start(dot)

    def refresh_issues(self):
        global LOCAL_ISSUES

        try:
            LOCAL_ISSUES = fetch_issues()
            print("DEBUG fetched count:", len(LOCAL_ISSUES))
            print("DEBUG fetched sample:", LOCAL_ISSUES[:1])
            print("DEBUG refreshed issues:", LOCAL_ISSUES)
        except Exception as e:
            print("ERROR fetching issues:", e)

        main = self.root.get_screen("main")
        main._last_loaded_tab = None  # 🔥 캐시 무효화
        main.populate_main_list()

    def go_history(self):
        self.root.current = "history"

    def go_main(self):
        self.root.current = "main"
        self.start_update_dot_animation()

    def open_detail(self, issue: dict):
        detail = self.root.get_screen("detail")
        detail.show_issue(issue)
        self.root.current = "detail"


if __name__ == "__main__":
    MainApp().run()
