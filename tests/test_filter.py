from main import get_filtered_issues


def test_get_all():
    rows = get_filtered_issues(keyword="", tab="전체")
    assert isinstance(rows, list)
    assert len(rows) >= 1


def test_company_filter():
    rows = get_filtered_issues(keyword="", tab="회사안")
    # 모든 결과는 company 필드가 비어있지 않아야 함
    assert all(r[2].strip() for r in rows)


def test_union_filter():
    rows = get_filtered_issues(keyword="", tab="조합안")
    assert all(r[3].strip() for r in rows)


def test_keyword_filter():
    rows = get_filtered_issues(keyword="임금교섭", tab="전체")
    # 특정 키워드로 검색하면 결과는 제목에 해당 키워드를 포함해야 함
    assert all("임금교섭" in r[0] for r in rows)
