import os
import requests
import sqlite3
from kivy.core.text import LabelBase
from kivy.lang import Builder
from kivy.metrics import dp
from kivy.uix.image import Image
from kivymd.app import MDApp
from kivymd.uix.screen import MDScreen
from kivymd.uix.list import TwoLineListItem
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.card import MDCard
from kivymd.uix.tab import MDTabsBase

# -----------------------------
# 폰트 등록
# -----------------------------
LabelBase.register(
    name="Nanum",
    fn_regular="/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    fn_bold="/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"
)

LabelBase.register(
    name="Roboto",
    fn_regular="/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    fn_bold="/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"
)

# -----------------------------
# SQLite 내부 경로
# -----------------------------
LOCAL_DB_PATH = "data/issues.db"
LOCAL_VERSION_PATH = "data/version.txt"

# 원격 버전 파일 URL (GitHub)
REMOTE_VERSION_URL = "https://raw.githubusercontent.com/도준계정/dojun_db/main/remote_version.json"


# -----------------------------
# DB 업데이트 체크
# -----------------------------
def get_local_version():
    if not os.path.exists(LOCAL_VERSION_PATH):
        return 1
    return int(open(LOCAL_VERSION_PATH).read().strip())


def get_remote_version():
    try:
        r = requests.get(REMOTE_VERSION_URL, timeout=5)
        info = r.json()
        return info["version"], info["db_url"]
    except:
        return None, None


def download_new_db(db_url, version):
    try:
        print("⬇️ 새로운 DB 다운로드 중...")
        r = requests.get(db_url, timeout=10)
        open("data/issues_new.db", "wb").write(r.content)

        # 기존 파일 백업 후 교체
        if os.path.exists(LOCAL_DB_PATH):
            os.rename(LOCAL_DB_PATH, "data/issues_old.db")

        os.rename("data/issues_new.db", LOCAL_DB_PATH)

        # 버전 갱신
        open(LOCAL_VERSION_PATH, "w").write(str(version))

        print("✅ DB 업데이트 성공")
    except Exception as e:
        print("❌ DB 다운로드 실패:", e)


def check_and_update_db():
    local_ver = get_local_version()
    remote_ver, db_url = get_remote_version()

    print(f"로컬 버전: {local_ver}, 원격 버전: {remote_ver}")

    if remote_ver and remote_ver > local_ver:
        download_new_db(db_url, remote_ver)
    else:
        print("최신 버전입니다.")


# -----------------------------
# DB 읽기 함수
# -----------------------------
def load_issues():
    conn = sqlite3.connect(LOCAL_DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT title, summary, company, union_opt FROM issues")
    rows = cur.fetchall()
    conn.close()
    return rows


def get_filtered_issues(keyword="", tab=None):
    kw = keyword.strip()
    rows = load_issues()

    def match(row):
        title, summary, company, union_opt = row
        if kw and kw not in title:
            return False
        if tab is None or tab == "전체":
            return True
        if tab == "회사안":
            return bool(company and company.strip())
        if tab == "조합안":
            return bool(union_opt and union_opt.strip())
        return True

    return [r for r in rows if match(r)]


class Tab(MDBoxLayout, MDTabsBase):
    pass


# -----------------------------
# 메인 화면
# -----------------------------
class MainScreen(MDScreen):
    current_tab = "전체"

    def populate_main_list(self, keyword=""):
        issue_list = self.ids.issue_list
        issue_list.clear_widgets()

        for row in get_filtered_issues(keyword, self.current_tab):
            title = row[0]
            item = TwoLineListItem(
                text=title,
                secondary_text="눌러서 자세히 보기",
                on_release=lambda x, t=title: app.open_detail(t),
            )
            issue_list.add_widget(item)

    def on_search_text(self, text):
        self.populate_main_list(keyword=text)

    def on_tab_switch(self, instance_tabs, instance_tab, instance_tab_label, tab_text):
        self.current_tab = tab_text
        self.populate_main_list()


# -----------------------------
# 상세 화면
# -----------------------------
class DetailScreen(MDScreen):
    def set_detail(self, title):
        title_label = self.ids.detail_title
        detail_box = self.ids.detail_box

        title_label.text = title
        detail_box.clear_widgets()

        conn = sqlite3.connect(LOCAL_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT summary, company, union_opt FROM issues WHERE title=?", (title,))
        row = cur.fetchone()
        conn.close()

        keys = ["핵심 요약", "회사안", "조합안"]

        for i, text in enumerate(row):
            card = MDCard(
                orientation="vertical",
                padding=dp(12),
                radius=[12]
            )
            card.add_widget(MDLabel(text=f"[b]{keys[i]}[/b]", markup=True, font_name="Nanum"))
            card.add_widget(MDLabel(text=text, font_name="Nanum"))
            detail_box.add_widget(card)


# -----------------------------
# 앱 전체
# -----------------------------
class MainApp(MDApp):
    def build(self):
        check_and_update_db()
        return Builder.load_file("dojun.kv")

    def on_start(self):
        main_screen = self.root.get_screen("main")
        main_screen.populate_main_list()
        main_screen.ids.tabs.bind(on_tab_switch=main_screen.on_tab_switch)

    def open_detail(self, title):
        screen = self.root.get_screen("detail")
        screen.set_detail(title)
        self.root.current = "detail"


app = MainApp()
app.run()
