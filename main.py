import os
import json
import requests

from kivy.core.text import LabelBase
from kivy.lang import Builder
from kivy.metrics import dp
from kivy.core.window import Window
from kivy.properties import StringProperty
from kivy.animation import Animation

from kivymd.app import MDApp
from kivymd.uix.screen import MDScreen
from kivymd.uix.list import TwoLineAvatarIconListItem, IconLeftWidget
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.card import MDCard
from kivymd.uix.label import MDIcon
from kivymd.uix.snackbar import Snackbar
from kivymd.uix.tab import MDTabsBase
from kivymd.uix.button import MDFlatButton
from functools import partial
from kivymd.uix.button import MDIconButton
from kivy.app import App
from kivy.clock import Clock
from kivy.animation import Animation
from kivy.uix.screenmanager import SlideTransition
from kivy.utils import platform
from kivy.core.window import Window
from firestore_client import load_issues_from_firestore

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
# 경로 / URL
# =============================
REMOTE_VERSION_URL = (
    "https://raw.githubusercontent.com/yudojun/dojun_app/main/remote_version.json"
)
LOCAL_VERSION_FILE = "local_version.json"


# =============================
# 업데이트 정보
# =============================
def get_remote_versions():
    try:
        r = requests.get(REMOTE_VERSION_URL, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print("❌ 업데이트 JSON 로드 실패:", e)
        return None


def get_update_info():
    try:
        r = requests.get(REMOTE_VERSION_URL, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"version": "?", "message": f"업데이트 정보 오류\n{e}"}


def get_local_version():
    if not os.path.exists(LOCAL_VERSION_FILE):
        return 0
    with open(LOCAL_VERSION_FILE, "r", encoding="utf-8") as f:
        return json.load(f).get("version", 0)


def has_new_update():
    try:
        data = get_remote_versions()
        if not data:
            return False

        latest = data.get("latest_version")

        # local_version.json 없으면 = 처음 실행 = 업데이트 있음
        if not os.path.exists(LOCAL_VERSION_FILE):
            return True

        with open(LOCAL_VERSION_FILE, "r", encoding="utf-8") as f:
            local = json.load(f).get("last_seen_version")

        return latest != local
    except Exception as e:
        print("❌ 업데이트 비교 실패:", e)
        return False


# =============================
# DB
# =============================


def get_filtered_issues(tab="전체"):
    rows = load_issues_from_firestore()

    def match(row):
        _, _, company, union_opt = row
        if tab == "회사안":
            return bool(company and company.strip())
        if tab == "조합안":
            return bool(union_opt and union_opt.strip())
        return True

    return [r for r in rows if match(r)]


class Tab(MDBoxLayout, MDTabsBase):
    pass


class ExpandableIssueCard(MDCard):
    def __init__(self, title, summary, company, union_opt, parent_screen, **kwargs):
        super().__init__(**kwargs)

        self.parent_screen = parent_screen
        self.title = title
        self.summary = summary or ""
        self.company = company or ""
        self.union_opt = union_opt or ""

        self.orientation = "vertical"
        self.padding = (dp(18), dp(16))
        self.radius = [14]
        self.elevation = 1
        self.size_hint_y = None

        # ---- 헤더(항상 보이는 부분) ----
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
            text=title,
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

        # ---- 내용(접혔다 펼쳐지는 부분) ----
        self.content = MDBoxLayout(
            orientation="vertical",
            spacing=dp(10),
            padding=(dp(34), dp(6), dp(4), dp(6)),  # 아이콘 자리만큼 왼쪽 여백
            size_hint_y=None,
            opacity=0,
            height=0,
        )

        # 내용 구성 (필요하면 여기 문구 바꿔도 됨)
        self.content.add_widget(self._section("핵심 요약", self.summary))
        self.content.add_widget(self._section("회사안", self.company))
        self.content.add_widget(self._section("조합안", self.union_opt))

        self.add_widget(self.content)

        # 카드 전체 높이(헤더만 보일 때)
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
                text=body if body.strip() else "(내용 없음)",
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

            target_height = self.content.minimum_height

            self.content.opacity = 0
            self.content.height = 0

            Animation(
                height=target_height,
                opacity=1,
                d=0.2,
                t="out_quad",
            ).start(self.content)

            Animation(
                height=self._collapsed_height + target_height,
                d=0.2,
                t="out_quad",
            ).start(self)

            ps.opened_card = self

        else:
            self._opened = False
            self.chev.icon = "chevron-down"

            self.content.opacity = 0
            self.content.height = 0
            self.height = self._collapsed_height

            ps.opened_card = None

    def force_close(self):
        """다른 카드가 열릴 때 강제로 닫히는 함수"""
        if not self._opened:
            return

        self._opened = False
        self.chev.icon = "chevron-down"

        Animation(
            height=0,
            opacity=0,
            d=0.15,
            t="out_quad",
        ).start(self.content)

        Animation(
            height=self._collapsed_height,
            d=0.15,
            t="out_quad",
        ).start(self)

        ps.opened_card = None


# =============================
# Screens
# =============================
class MainScreen(MDScreen):
    current_tab = "전체"
    update_text = StringProperty("")
    opened_card = None

    _last_loaded_tab = None

    def populate_main_list(self):
        self.opened_card = None
        if self._last_loaded_tab == self.current_tab:
            return

        print("=== populate_main_list start ===")
        self.ids.issue_list.clear_widgets()

        issues = get_filtered_issues(self.current_tab)

        # ===== 🔥 EMPTY STATE 처리 =====
        if not issues:
            empty_card = MDCard(
                orientation="vertical",
                padding=(dp(20), dp(20)),
                radius=[14],
                elevation=0,
                md_bg_color=(0.96, 0.96, 0.96, 1),
                size_hint_y=None,
            )
            empty_card.bind(minimum_height=empty_card.setter("height"))

            empty_card.add_widget(
                MDLabel(
                    text="📭 현재 등록된 쟁점이 없습니다",
                    font_name="Nanum",
                    font_size="16sp",
                    halign="center",
                    theme_text_color="Secondary",
                    size_hint_y=None,
                    height=dp(32),
                )
            )

            empty_card.add_widget(
                MDLabel(
                    text="새로운 쟁점이 등록되면\n이곳에 자동으로 표시됩니다.",
                    font_name="Nanum",
                    halign="center",
                    theme_text_color="Secondary",
                    size_hint_y=None,
                )
            )

            self.ids.issue_list.add_widget(empty_card)
            self._last_loaded_tab = self.current_tab
            return
        # ===== 🔥 EMPTY STATE 끝 =====

        seen_titles = set()

        for title, summary, company, union_opt in issues:
            if title in seen_titles:
                continue
            seen_titles.add(title)

            card = ExpandableIssueCard(
                title=title,
                summary=summary,
                company=company,
                union_opt=union_opt,
                parent_screen=self,
            )
            self.ids.issue_list.add_widget(card)

        self._last_loaded_tab = self.current_tab

    def on_tab_switch(self, *args):
        new_tab = args[-1]
        if self.current_tab == new_tab:
            return

        self.current_tab = new_tab

        # 🔹 리스트 페이드 아웃 → 인
        lst = self.ids.issue_list
        Animation(opacity=0, d=0.08).start(lst)

        def reload(dt):
            self._last_loaded_tab = None  # 강제 리로드
            self.populate_main_list()
            lst.parent.scroll_y = 1
            Animation(opacity=1, d=0.12).start(lst)

        Clock.schedule_once(reload, 0.08)


class DetailScreen(MDScreen):
    def set_detail(self, title, summary, company, union_opt):
        self.ids.detail_box.clear_widgets()

        labels = ["핵심 요약", "회사안", "조합안"]
        values = [summary, company, union_opt]

        for label, text in zip(labels, values):
            card = MDCard(
                orientation="vertical",
                padding=(dp(16), dp(14)),
                radius=[14],
                size_hint_y=None,
            )
            card.bind(minimum_height=card.setter("height"))

            card.add_widget(
                MDLabel(
                    text=label,
                    font_name="Nanum",
                    bold=True,
                    font_size="17sp",
                )
            )

            card.add_widget(
                MDLabel(
                    text=text or "(내용 없음)",
                    font_name="Nanum",
                    line_height=1.4,
                    size_hint_y=None,
                )
            )

            self.ids.detail_box.add_widget(card)


class UpdateHistoryScreen(MDScreen):
    def on_enter(self):
        # ✅ 업데이트 확인 처리 (여기서 핵심)
        data = get_remote_versions()
        if data:
            with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
                json.dump(
                    {"last_seen_version": data.get("latest_version")},
                    f,
                    ensure_ascii=False,
                )

        container = self.ids.history_container
        container.clear_widgets()
        ...

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

        for v in versions:
            is_latest = v["version"] == latest_version

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

            # ---------- Header ----------
            header = MDBoxLayout(
                orientation="horizontal",
                size_hint_y=None,
                height=dp(44),
                padding=(dp(12), 0),
            )

            title_text = f"[b]버전 {v['version']}[/b]"
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

            # ---------- Content ----------
            content = MDBoxLayout(
                orientation="vertical",
                padding=(dp(16), dp(8)),
                spacing=dp(6),
                size_hint_y=None,
            )

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

            # ---------- Toggle ----------
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
    is_navigating = False

    def safe_update_check(self, dt):
        print("=== safe_update_check ===")

        try:

            main = self.root.get_screen("main")

            if has_new_update():
                self.start_update_dot_animation()
            else:
                main.ids.update_dot.opacity = 0

            self.show_update_snackbar(status)

        except Exception as e:
            print("❌ update check failed:", e)

    def start_update_dot_animation(self):
        print("=== start_update_dot_animation ===")

        try:
            main = self.root.get_screen("main")
            dot = main.ids.update_dot
        except Exception as e:
            print("❌ update_dot 접근 실패:", e)
            return

        dot.opacity = 1
        Animation.cancel_all(dot)
        anim = Animation(opacity=0.3, d=0.8) + Animation(opacity=1, d=0.8)
        anim.repeat = True
        anim.start(dot)

    def build(self):
        print("=== build() called ===")
        return Builder.load_file("dojun.kv")

    def on_start(self):
        print("=== on_start ===")

        # 1) main screen 잡기 (보호막)
        try:
            main = self.root.get_screen("main")
        except Exception as e:
            print("❌ get_screen('main') 실패:", e)
            return  # main을 못 잡으면 더 진행하지 말고 종료(앱은 유지)

        # 2) main 초기화 (보호막)
        try:
            main._last_loaded_tab = None  # 강제 초기화
            main.populate_main_list()
            main.ids.tabs.bind(on_tab_switch=main.on_tab_switch)
        except Exception as e:
            print("❌ main 초기화 실패:", e)

        # 3) 무거운 건 지연 실행
        Clock.schedule_once(self.safe_update_check, 1)

    def open_detail(self, title, summary, company, union_opt):
        print("=== open_detail ===", title)

        if self.is_navigating:
            print("⏳ navigation locked")
            return

        self.is_navigating = True

        try:
            detail = self.root.get_screen("detail")
            detail.set_detail(title, summary, company, union_opt)
            self.root.current = "detail"

        except Exception as e:
            print("❌ detail 화면 처리 실패:", e)

        finally:
            Clock.schedule_once(lambda dt: self._unlock_nav(), 0.3)

    def _unlock_nav(self):
        self.is_navigating = False

    def show_update_snackbar(self, has_update):
        try:
            if has_update:
                text = "🔔 새로운 쟁점이 있습니다"
            else:
                text = "✅ 최신 쟁점입니다"

            Snackbar(text=text, duration=2).open()

        except Exception as e:
            print("❌ Snackbar 실패:", e)

    def go_history(self):
        print("=== go_history ===")

        try:
            data = get_remote_versions()
            if data:
                with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
                    json.dump(
                        {"last_seen_version": data.get("latest_version")},
                        f,
                        ensure_ascii=False,
                    )
        except Exception as e:
            print("❌ go_history update 실패:", e)

        self.root.current = "history"

    def go_main(self):
        print("=== go_main ===")

        try:
            main = self.root.get_screen("main")
            self.root.current = "main"
        except Exception as e:
            print("❌ get_screen('main') 실패:", e)
            return

        try:
            if has_new_update():
                self.start_update_dot_animation()
            else:
                main.ids.update_dot.opacity = 0
                Animation.cancel_all(main.ids.update_dot)

            self.root.current = "main"
        except Exception as e:
            print("❌ go_main 처리 실패:", e)


if __name__ == "__main__":
    app = MainApp()
    app.run()
