import os
import json
import requests
import sqlite3

from kivy.core.text import LabelBase
from kivy.lang import Builder
from kivy.metrics import dp

from kivymd.app import MDApp
from kivymd.uix.screen import MDScreen
from kivymd.uix.list import TwoLineAvatarIconListItem, IconLeftWidget
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.card import MDCard
from kivymd.uix.snackbar import MDSnackbar
from kivymd.uix.tab import MDTabsBase
from kivymd.uix.dialog import MDDialog
from kivymd.uix.button import MDFlatButton
from kivy.core.window import Window

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
from kivy.properties import StringProperty


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
            icon = IconLeftWidget(icon="file-document-outline")
            item.add_widget(icon)
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
            card.add_widget(
                MDLabel(
                    text=f"[b]{labels[i]}[/b]",
                    markup=True,
                    font_name="Nanum",
                    font_size=dp(18),
                )
            )
            card.add_widget(MDLabel(text=text, font_name="Nanum"))
            card.height = card.minimum_height
            self.ids.detail_box.add_widget(card)


class UpdateHistoryScreen(MDScreen):
    update_text = StringProperty("")

    def on_enter(self):
        info = get_update_info()

        self.update_text = (
            "[b]버전 3[/b]\n\n"
            "☑ v3 업데이트\n"
            "• 쟁점 자동 업데이트 기능 추가\n"
            "• 업데이트 내역 보기 버튼 추가\n"
            "• UI 안정성 개선\n\n"
            "[color=#777777]※ 앱 실행 시 자동으로 반영됩니다.[/color]"
)


# =============================
# App
# =============================
from kivy.uix.screenmanager import ScreenManager


class MainApp(MDApp):

    def build(self):
        print("🔥 build() 호출됨")
        return Builder.load_file("dojun.kv")

    def on_start(self):
        print("🔥 on_start 진입")
        status = update_db_if_needed()

        main = self.root.get_screen("main")
        main.populate_main_list()
        main.ids.tabs.bind(on_tab_switch=main.on_tab_switch)

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
            MDLabel(text=text),
            y=dp(24),
            pos_hint={"center_x": 0.5},
            size_hint_x=0.9,
            duration=2,
        ).open()

    def go_history(self):
        self.root.current = "history"

    def go_main(self):
        self.root.current = "main"


if __name__ == "__main__":
    print("🔥 __main__ 진입")
    app = MainApp()
    app.run()
