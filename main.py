import os
import json
import requests

from kivy.core.text import LabelBase
from kivy.lang import Builder
from kivy.metrics import dp
from kivy.core.window import Window
from kivy.properties import StringProperty
from kivy.clock import Clock
from kivy.animation import Animation
from kivy.utils import platform

from kivymd.app import MDApp
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel, MDIcon
from kivymd.uix.card import MDCard
from kivymd.uix.tab import MDTabsBase
from kivymd.uix.button import MDIconButton, MDFlatButton
from api_client import fetch_issues


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
REMOTE_VERSION_URL = (
    "https://raw.githubusercontent.com/yudojun/dojun_app/main/remote_version.json"
)
LOCAL_VERSION_FILE = "local_version.json"


def get_remote_versions():
    try:
        r = requests.get(REMOTE_VERSION_URL, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print("❌ remote_version.json 로드 실패:", e)
        return None


def has_new_update():
    """
    latest_version 값이 바뀌었는지 표시(점 깜빡임)
    """
    try:
        data = get_remote_versions()
        if not data:
            return False

        latest = data.get("latest_version")
        if not latest:
            return False

        if not os.path.exists(LOCAL_VERSION_FILE):
            return True

        with open(LOCAL_VERSION_FILE, "r", encoding="utf-8") as f:
            local = json.load(f).get("last_seen_version")

        return latest != local

    except Exception as e:
        print("❌ has_new_update 실패:", e)
        return False


def get_filtered_issues(tab="전체"):
    """
    서버(FastAPI)에서 /issues JSON을 받아서
    기존 UI가 기대하는 튜플 형태로 변환 + 탭 필터 적용
    반환: (title, summary, company, union_opt) 리스트
    """
    rows = fetch_issues()

    def match(row):
        if tab == "회사안":
            return bool(row.get("company"))
        if tab == "조합안":
            return bool(row.get("union"))
        return True

    return [
        (
            row.get("title", ""),
            row.get("summary", ""),
            row.get("company", ""),
            row.get("union", ""),
        )
        for row in rows
        if match(row)
    ]


def match(row):
    if tab == "회사안":
        return row.get("company")
    if tab == "조합안":
        return row.get("union")
    return True

    return [
        (
            row.get("title", ""),
            row.get("summary", ""),
            row.get("company", ""),
            row.get("union", ""),
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
    def __init__(self, title, summary, company, union_opt, parent_screen, **kwargs):
        super().__init__(**kwargs)

        self.parent_screen = parent_screen
        self.title = title or ""
        self.summary = summary or ""
        self.company = company or ""
        self.union_opt = union_opt or ""

        self.orientation = "vertical"
        self.padding = (dp(18), dp(16))
        self.radius = [14]
        self.elevation = 1
        self.size_hint_y = None

        # ---- 헤더 ----
        header = MDBoxLayout(
            orientation="horizontal",
            spacing=dp(10),
            size_hint_y=None,
            height=dp(44),
        )

        header.add_widget(
            MDIcon(
                icon="file-document-outline",
                size_hint=(None, None),
                size=(dp(24), dp(24)),
                theme_text_color="Primary",
            )
        )

        self.title_label = MDLabel(
            text=self.title,
            font_name="Nanum",
            bold=True,
            font_size="16sp",
            valign="middle",
        )

        self.chev = MDIconButton(
            icon="chevron-down",
            pos_hint={"center_y": 0.5},
            on_release=self.toggle,
        )

        header.add_widget(self.title_label)
        header.add_widget(self.chev)

        self.add_widget(header)

        # ---- 펼쳐지는 영역 ----
        self.content = MDBoxLayout(
            orientation="vertical",
            spacing=dp(10),
            padding=(dp(34), dp(6), dp(4), dp(6)),
            size_hint_y=None,
            opacity=0,
            height=0,
        )

        self.content.add_widget(self._section("핵심 요약", self.summary))
        self.content.add_widget(self._section("회사안", self.company))
        self.content.add_widget(self._section("조합안", self.union_opt))

        self.add_widget(self.content)

        self._collapsed_height = dp(56)
        self.height = self._collapsed_height
        self._opened = False

    def _section(self, title, body):
        box = MDBoxLayout(orientation="vertical", spacing=dp(4), size_hint_y=None)
        box.bind(minimum_height=box.setter("height"))

        box.add_widget(
            MDLabel(
                text=title,
                font_name="Nanum",
                bold=True,
                font_size="14sp",
                size_hint_y=None,
                height=dp(18),
            )
        )

        box.add_widget(
            MDLabel(
                text=body.strip() if body and body.strip() else "(내용 없음)",
                font_name="Nanum",
                line_height=1.35,
                size_hint_y=None,
            )
        )
        return box

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

    def on_tab_switch(self, tabs, tab, tab_label, tab_text):
        if self.current_tab == tab_text:
            return

        self.current_tab = tab_text
        self._last_loaded_tab = None
        self.populate_main_list()

    def on_kv_post(self, base_widget):
        self._last_loaded_tab = None
        self.populate_main_list()

    def populate_main_list(self):
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
                union_opt=union_opt,
                parent_screen=self,
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
            Animation(opacity=1, d=0.12).start(lst)

        Clock.schedule_once(_reload, 0.08)


class UpdateHistoryScreen(MDScreen):
    def on_enter(self):
        container = self.ids.history_container
        container.clear_widgets()

        data = get_remote_versions()
        if not data:
            container.add_widget(
                MDLabel(
                    text="업데이트 정보를 불러올 수 없습니다.",
                    font_name="Nanum",
                )
            )
            return

        latest_version = data.get("latest_version")
        versions = data.get("versions", [])

        # 방문 표시(새 점 끄기)
        try:
            with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
                json.dump({"last_seen_version": latest_version}, f, ensure_ascii=False)
        except Exception as e:
            print("❌ local_version 저장 실패:", e)

        for v in versions:
            is_latest = v.get("version") == latest_version

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

            title_text = f"[b]버전 {v.get('version','?')}[/b]"
            if is_latest:
                title_text += "  [color=#E53935]NEW[/color]"

            header_label = MDLabel(
                text=title_text,
                markup=True,
                font_name="Nanum",
                font_size="16sp",
                valign="middle",
            )

            toggle_btn = MDFlatButton(
                text="",
                size_hint=(1, 1),
                md_bg_color=(0, 0, 0, 0),
            )

            header.add_widget(header_label)
            header.add_widget(toggle_btn)
            card.add_widget(header)

            content = MDBoxLayout(
                orientation="vertical",
                padding=(dp(16), dp(8)),
                spacing=dp(6),
                size_hint_y=None,
            )

            if v.get("title"):
                content.add_widget(
                    MDLabel(
                        text=f"☑ {v['title']}",
                        font_name="Nanum",
                        size_hint_y=None,
                    )
                )

            for item in v.get("items", []):
                content.add_widget(
                    MDLabel(
                        text=f"• {item}",
                        font_name="Nanum",
                        size_hint_y=None,
                    )
                )

            if v.get("note"):
                content.add_widget(
                    MDLabel(
                        text=f"[color=#777777]{v['note']}[/color]",
                        markup=True,
                        font_name="Nanum",
                        size_hint_y=None,
                    )
                )

            content.bind(minimum_height=content.setter("height"))

            if is_latest:
                content.opacity = 1
                content.height = content.minimum_height
            else:
                content.opacity = 0
                content.height = 0

            card.add_widget(content)

            def make_toggle(cbox):
                def _toggle(*args):
                    if cbox.height == 0:
                        Animation(height=cbox.minimum_height, opacity=1, d=0.15).start(
                            cbox
                        )
                    else:
                        Animation(height=0, opacity=0, d=0.15).start(cbox)

                return _toggle

            toggle_btn.bind(on_release=make_toggle(content))
            container.add_widget(card)


# =============================
# App
# =============================
class MainApp(MDApp):
    def build(self):
        return Builder.load_file("dojun.kv")

    def on_start(self):
        # 탭 구성 (KV에서 텅 비어있으니 여기서 생성)
        main = self.root.get_screen("main")

        # 업데이트 점 표시
        Clock.schedule_once(lambda dt: self._apply_update_dot(), 0.6)

    def _apply_update_dot(self):
        main = self.root.get_screen("main")
        if has_new_update():
            self.start_update_dot_animation()
        else:
            dot = main.ids.get("update_dot")
            if dot:
                dot.opacity = 1
                Animation.cancel_all(dot)

    def start_update_dot_animation(self):
        main = self.root.get_screen("main")
        dot = main.ids.update_dot
        dot.opacity = 1
        Animation.cancel_all(dot)
        anim = Animation(opacity=0.3, d=0.8) + Animation(opacity=1, d=0.8)
        anim.repeat = True
        anim.start(dot)

    def refresh_issues(self):
        """
        ⟳ 아이콘 눌렀을 때: Firestore 재로딩
        """
        main = self.root.get_screen("main")
        main._last_loaded_tab = None
        main.populate_main_list()

    def go_history(self):
        self.root.current = "history"

    def go_main(self):
        self.root.current = "main"
        self._apply_update_dot()


if __name__ == "__main__":
    MainApp().run()
