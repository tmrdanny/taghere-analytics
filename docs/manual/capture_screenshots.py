#!/usr/bin/env python3
"""
TagHere Analytics 매뉴얼용 스크린샷 캡처 스크립트
"""

from playwright.sync_api import sync_playwright
import os
import time

SCREENSHOTS_DIR = "/Users/zeroclasslab_1/Desktop/Code/taghere-analytics/docs/manual/screenshots"
BASE_URL = "http://localhost:3000"

def capture_screenshots():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            locale='ko-KR'
        )
        page = context.new_page()

        # 1. 로그인 화면
        print("1. 로그인 화면 캡처...")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/01_login.png", full_page=False)

        # 로그인 수행
        print("   로그인 중...")
        page.fill('input[type="text"], input[placeholder*="아이디"], input[name="username"]', 'taghere')
        page.fill('input[type="password"]', '0614')
        page.click('button[type="submit"], button:has-text("로그인")')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)  # 대시보드 로딩 대기

        # 2. 대시보드 전체 화면
        print("2. 대시보드 전체 화면 캡처...")
        page.screenshot(path=f"{SCREENSHOTS_DIR}/02_dashboard_full.png", full_page=True)

        # 3. KPI 카드 영역 (상단)
        print("3. KPI 카드 영역 캡처...")
        page.screenshot(path=f"{SCREENSHOTS_DIR}/03_kpi_cards.png", full_page=False)

        # 4. 날짜 필터 (클릭해서 열기)
        print("4. 날짜 필터 캡처...")
        try:
            date_filter = page.locator('button:has-text("Last"), button:has-text("Today"), button:has-text("days"), [data-testid="date-filter"]').first
            date_filter.click()
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/04_date_filter.png", full_page=False)
            page.keyboard.press('Escape')
        except:
            page.screenshot(path=f"{SCREENSHOTS_DIR}/04_date_filter.png", full_page=False)

        # 5. 스크롤해서 차트 영역 캡처
        print("5. 수익 트렌드 차트 캡처...")
        page.evaluate("window.scrollTo(0, 400)")
        page.wait_for_timeout(500)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/05_revenue_chart.png", full_page=False)

        # 6. Top 데이터 테이블 영역
        print("6. Top 데이터 테이블 캡처...")
        page.evaluate("window.scrollTo(0, 800)")
        page.wait_for_timeout(500)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/06_top_tables.png", full_page=False)

        # 7-11. 메뉴 분석 탭들
        print("7. 메뉴 분석 탭 캡처...")
        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(500)

        # 순위 탭
        page.screenshot(path=f"{SCREENSHOTS_DIR}/07_menu_rankings.png", full_page=False)

        # 기여도 탭
        try:
            contrib_tab = page.locator('button:has-text("기여도"), [role="tab"]:has-text("Contribution"), button:has-text("Revenue Contribution")').first
            contrib_tab.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/08_menu_contribution.png", full_page=False)
        except:
            print("   기여도 탭 찾기 실패")

        # 트렌드 탭
        try:
            trend_tab = page.locator('button:has-text("트렌드"), [role="tab"]:has-text("Trend"), button:has-text("Menu Trend")').first
            trend_tab.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/09_menu_trends.png", full_page=False)
        except:
            print("   트렌드 탭 찾기 실패")

        # 교차판매 탭
        try:
            cross_tab = page.locator('button:has-text("교차"), [role="tab"]:has-text("Cross"), button:has-text("Cross-Selling")').first
            cross_tab.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/10_menu_cross_selling.png", full_page=False)
        except:
            print("   교차판매 탭 찾기 실패")

        # 판매량 비교 탭
        try:
            compare_tab = page.locator('button:has-text("비교"), [role="tab"]:has-text("Comparison"), button:has-text("Menu Comparison")').first
            compare_tab.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/11_menu_comparison.png", full_page=False)
        except:
            print("   판매량 비교 탭 찾기 실패")

        # 12. 탐색 페이지 - 메뉴 검색
        print("12. 탐색 페이지 - 메뉴 검색 캡처...")
        page.goto(f"{BASE_URL}/explore")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/12_explore_menu_search.png", full_page=False)

        # 13. 탐색 페이지 - 스키마 탐색 탭
        print("13. 탐색 페이지 - 스키마 탐색 캡처...")
        try:
            schema_tab = page.locator('button:has-text("스키마"), [role="tab"]:has-text("Schema"), button:has-text("탐색")').first
            schema_tab.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/13_explore_schema.png", full_page=False)
        except:
            print("   스키마 탭 찾기 실패")

        # 14. 데이터 동기화 (대시보드로 돌아가서)
        print("14. 데이터 동기화 버튼 캡처...")
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(500)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/14_data_sync.png", full_page=False)

        browser.close()
        print("\n완료! 스크린샷이 저장되었습니다:", SCREENSHOTS_DIR)

if __name__ == "__main__":
    capture_screenshots()
