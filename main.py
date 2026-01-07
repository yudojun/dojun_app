import os
import json
import requests
import sqlite3

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
from kivymd.uix.snackbar import MDSnackbar
from kivymd.uix.tab import MDTabsBase
from kivymd.uix.button import MDFlatButton


# ===== 모바일 비율 고정 (개발용) =====
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
LOCAL_DB_FILE = "data/issues.db"


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


def download_db(url):
    os.makedirs("data", exist_ok=True)
    r = requests.get(url, stream=True, timeout=10)
    r.raise_for_status()
    with open(LOCAL_DB_FILE, "wb") as f:
        for chunk in r.iter_content(1024):
            f.write(chunk)


def update_db_if_needed():
    try:
        local_v = get_local_version()
        remote = get_update_info()
        remote_v = remote.get("version", 0)
        db_url = remote.get("url")

        if remote_v > local_v and db_url:
            download_db(db_url)
            with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
                json.dump({"version": remote_v}, f)
            return "updated"
        return "latest"
    except Exception:
        return "error"


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
def load_issues():
    conn = sqlite3.connect(LOCAL_DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT title, summary, company, union_opt FROM issues")
    rows = cur.fetchall()
    conn.close()
    return rows


def get_filtered_issues(tab="전체"):
    rows = load_issues()

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


# =============================
# Screens
# =============================
class MainScreen(MDScreen):
    current_tab = "전체"
    update_text = StringProperty("")

    def populate_main_list(self):
        self.ids.issue_list.clear_widgets()

        for title, *_ in get_filtered_issues(self.current_tab):
            item = TwoLineAvatarIconListItem(
                text=title,
                secondary_text="눌러서 자세히 보기",
                on_release=lambda x, t=title: app.open_detail(t),
            )
            item.add_widget(IconLeftWidget(icon="file-document-outline"))
            self.ids.issue_list.add_widget(item)

    def on_tab_switch(self, *args):
        self.current_tab = args[-1]
        self.populate_main_list()


class DetailScreen(MDScreen):
    def set_detail(self, title):
        self.ids.detail_title.text = title
        self.ids.detail_box.clear_widgets()

        conn = sqlite3.connect(LOCAL_DB_FILE)
        cur = conn.cursor()
        cur.execute(
            "SELECT summary, company, union_opt FROM issues WHERE title=?",
            (title,),
        )
        row = cur.fetchone()
        conn.close()

        if not row:
            return

        labels = ["핵심 요약", "회사안", "조합안"]
        for i, text in enumerate(row):
            card = MDCard(
                orientation="vertical",
                padding=dp(12),
                radius=[12],
                size_hint_y=None,
            )
            card.bind(minimum_height=card.setter("height"))

            card.add_widget(
                MDLabel(
                    text=f"[b]{labels[i]}[/b]",
                    markup=True,
                    font_name="Nanum",
                    font_size="18sp",
                    size_hint_y=None,
                    height=dp(28),
                )
            )
            card.add_widget(
                MDLabel(
                    text=text or "",
                    font_name="Nanum",
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
                padding=dp(8),
                radius=[12],
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
    from kivy.animation import Animation

    def start_update_dot_animation(self):
        dot = self.root.get_screen("main").ids.update_dot

        dot.opacity = 1

        anim = Animation(opacity=0.3, d=0.8) + Animation(opacity=1, d=0.8)
        anim.repeat = True
        anim.start(dot)

    def build(self):
        return Builder.load_file("dojun.kv")

    def on_start(self):
        status = update_db_if_needed()

        main = self.root.get_screen("main")
        main.populate_main_list()
        main.ids.tabs.bind(on_tab_switch=main.on_tab_switch)

        if has_new_update():
            self.start_update_dot_animation()
        else:
            main.ids.update_dot.opacity = 0

        self.show_update_snackbar(status)

    def open_detail(self, title):
        detail = self.root.get_screen("detail")
        detail.set_detail(title)
        self.root.current = "detail"

    def show_update_snackbar(self, status):
        if status == "updated":
            text = "📦 새로운 쟁점 DB가 업데이트되었습니다"
        elif status == "latest":
            text = "✅ 최신 쟁점 DB입니다"
        else:
            text = "⚠ 업데이트 상태를 확인할 수 없습니다"

        MDSnackbar(
            MDLabel(text=text, font_name="Nanum"),
            y=dp(24),
            pos_hint={"center_x": 0.5},
            size_hint_x=0.9,
            duration=2,
        ).open()

    def go_history(self):
        # 최신 버전을 '확인함'으로 저장
        data = get_remote_versions()
        if data:
            with open(LOCAL_VERSION_FILE, "w", encoding="utf-8") as f:
                json.dump(
                    {"last_seen_version": data.get("latest_version")},
                    f,
                    ensure_ascii=False,
                )

        self.root.current = "history"

    def go_main(self):
        main = self.root.get_screen("main")

        if has_new_update():
            self.start_update_dot_animation()
        else:
            main.ids.update_dot.opacity = 0
            Animation.cancel_all(main.ids.update_dot)

        self.root.current = "main"


if __name__ == "__main__":
    app = MainApp()
    app.run()
