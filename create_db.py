import sqlite3

conn = sqlite3.connect("data/issues.db")
cur = conn.cursor()

cur.execute("DROP TABLE IF EXISTS issues")

cur.execute("""
CREATE TABLE issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    summary TEXT,
    company TEXT,
    union_opt TEXT
)
""")

data = [
    (
        "임금교섭 3차 - 격차 조정 논의",
        "임금격차 조정 및 평가체계 개선 논의",
        "기존 임금체계 유지",
        "격차 해소 + 기본급 조정"
    ),
    (
        "직무급 전환 - 장기 리스크 분석",
        "직무급 전환 시 장기 리스크 검토",
        "직무급 논의 중",
        "직무급 반대, 기본급 중심 유지"
    ),
    (
        "정년연장 - 업계 비교",
        "업계 정년 비교",
        "추가 논의 필요",
        "정년 63세 요구"
    ),
    (
        "근로개선 TF - 실사 완료",
        "근로환경 실사 완료",
        "순차 개선 예정",
        "즉각 개선 요구"
    )
]

cur.executemany("""
INSERT INTO issues (title, summary, company, union_opt)
VALUES (?, ?, ?, ?)
""", data)

conn.commit()
conn.close()

print("도준앱 DB 재생성 완료!")
