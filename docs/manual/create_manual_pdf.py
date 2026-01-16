#!/usr/bin/env python3
"""
TagHere Analytics 관리자 매뉴얼 PDF 생성 스크립트
한글 폰트 지원 버전
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle, ListFlowable, ListItem
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# macOS 한글 폰트 등록 (사용자 폴더의 TTF 폰트 사용)
FONT_REGULAR = "/Users/zeroclasslab_1/Library/Fonts/AppleSDGothicNeoM.ttf"  # Medium
FONT_BOLD = "/Users/zeroclasslab_1/Library/Fonts/AppleSDGothicNeoB.ttf"  # Bold
pdfmetrics.registerFont(TTFont('AppleSDGothicNeo', FONT_REGULAR))
pdfmetrics.registerFont(TTFont('AppleSDGothicNeoBold', FONT_BOLD))

SCREENSHOTS_DIR = "/Users/zeroclasslab_1/Desktop/Code/taghere-analytics/docs/manual/screenshots"
LOGO_PATH = "/Users/zeroclasslab_1/Desktop/Code/taghere-analytics/public/taghere-logo.png"
OUTPUT_PATH = "/Users/zeroclasslab_1/Desktop/Code/taghere-analytics/docs/TagHere-Analytics-Admin-Manual.pdf"

def create_styles():
    styles = getSampleStyleSheet()

    # 제목 스타일
    styles.add(ParagraphStyle(
        name='KoreanTitle',
        fontName='AppleSDGothicNeoBold',
        fontSize=32,
        leading=40,
        alignment=TA_CENTER,
        spaceAfter=20,
        textColor=colors.HexColor('#1a1a2e')
    ))

    # 부제목 스타일
    styles.add(ParagraphStyle(
        name='CoverSubtitle',
        fontName='AppleSDGothicNeo',
        fontSize=18,
        leading=24,
        alignment=TA_CENTER,
        spaceAfter=10,
        textColor=colors.HexColor('#4a4a4a')
    ))

    # 대제목 (H1) 스타일
    styles.add(ParagraphStyle(
        name='KoreanHeading1',
        fontName='AppleSDGothicNeoBold',
        fontSize=20,
        leading=26,
        spaceBefore=25,
        spaceAfter=15,
        textColor=colors.HexColor('#16213e'),
        borderColor=colors.HexColor('#3b82f6'),
        borderWidth=0,
        borderPadding=0,
    ))

    # 중제목 (H2) 스타일
    styles.add(ParagraphStyle(
        name='KoreanHeading2',
        fontName='AppleSDGothicNeoBold',
        fontSize=14,
        leading=20,
        spaceBefore=18,
        spaceAfter=10,
        textColor=colors.HexColor('#0f3460')
    ))

    # 소제목 (H3) 스타일
    styles.add(ParagraphStyle(
        name='KoreanHeading3',
        fontName='AppleSDGothicNeoBold',
        fontSize=12,
        leading=16,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.HexColor('#1e3a5f')
    ))

    # 본문 스타일
    styles.add(ParagraphStyle(
        name='KoreanBody',
        fontName='AppleSDGothicNeo',
        fontSize=11,
        leading=18,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
        textColor=colors.HexColor('#333333')
    ))

    # 불렛 포인트 스타일
    styles.add(ParagraphStyle(
        name='KoreanBullet',
        fontName='AppleSDGothicNeo',
        fontSize=11,
        leading=16,
        leftIndent=25,
        spaceAfter=6,
        textColor=colors.HexColor('#333333')
    ))

    # 캡션 스타일
    styles.add(ParagraphStyle(
        name='KoreanCaption',
        fontName='AppleSDGothicNeo',
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        spaceBefore=8,
        spaceAfter=18,
        textColor=colors.HexColor('#666666'),
        fontStyle='italic'
    ))

    # 팁/노트 스타일
    styles.add(ParagraphStyle(
        name='KoreanTip',
        fontName='AppleSDGothicNeo',
        fontSize=10,
        leading=14,
        leftIndent=15,
        rightIndent=15,
        spaceBefore=10,
        spaceAfter=10,
        textColor=colors.HexColor('#1e40af'),
        backColor=colors.HexColor('#eff6ff'),
        borderColor=colors.HexColor('#3b82f6'),
        borderWidth=1,
        borderPadding=8,
    ))

    # 목차 스타일
    styles.add(ParagraphStyle(
        name='TOCEntry',
        fontName='AppleSDGothicNeo',
        fontSize=11,
        leading=20,
        textColor=colors.HexColor('#333333')
    ))

    return styles

def add_screenshot(story, filename, caption, styles, width=15*cm):
    """스크린샷과 캡션을 추가합니다"""
    img_path = os.path.join(SCREENSHOTS_DIR, filename)
    if os.path.exists(img_path):
        img = Image(img_path, width=width, height=width*0.625)
        img.hAlign = 'CENTER'
        story.append(img)
        story.append(Paragraph(caption, styles['KoreanCaption']))
    else:
        story.append(Paragraph(f"[이미지를 찾을 수 없음: {filename}]", styles['KoreanCaption']))

def create_cover_page(story, styles):
    """표지 페이지 생성"""
    story.append(Spacer(1, 4*cm))

    # 로고
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=5*cm, height=5*cm)
        logo.hAlign = 'CENTER'
        story.append(logo)

    story.append(Spacer(1, 2*cm))

    # 제목
    story.append(Paragraph("TagHere Analytics", styles['KoreanTitle']))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("관리자 매뉴얼", styles['CoverSubtitle']))

    story.append(Spacer(1, 4*cm))

    # 버전 정보
    version_style = ParagraphStyle(
        'VersionStyle',
        parent=styles['KoreanBody'],
        alignment=TA_CENTER,
        fontSize=12
    )
    story.append(Paragraph("Version 1.0", version_style))
    story.append(Paragraph("2024년 12월", version_style))

    story.append(Spacer(1, 2*cm))

    # 대상 독자
    story.append(Paragraph("대상: 관리자 및 운영자", version_style))

    story.append(PageBreak())

def create_toc(story, styles):
    """목차 생성"""
    story.append(Paragraph("목차", styles['KoreanHeading1']))
    story.append(Spacer(1, 0.8*cm))

    toc_items = [
        "1. 시작하기 - 로그인 및 로그아웃",
        "2. 대시보드 개요 - 전체 화면 구성",
        "3. KPI 카드 - 핵심 성과 지표 이해하기",
        "4. 날짜 필터 - 조회 기간 설정하기",
        "5. 매장 그룹 관리 - 특정 매장 필터링",
        "6. 수익 트렌드 차트 - 매출 추이 분석",
        "7. Top 데이터 테이블 - 상위 매장/메뉴 확인",
        "8. 메뉴 분석",
        "    8.1 순위 - 판매량/매출 기준 Top 메뉴",
        "    8.2 기여도 - 파레토 분석",
        "    8.3 트렌드 - 메뉴별 판매 추이",
        "    8.4 교차판매 - 함께 팔리는 메뉴",
        "    8.5 판매량 비교 - 메뉴간 비교",
        "9. 탐색 페이지",
        "    9.1 메뉴 검색 - 메뉴로 매장 찾기",
        "    9.2 스키마 탐색 - 데이터 구조 확인",
        "10. 데이터 동기화 - 최신 데이터 가져오기",
        "11. 문제 해결 - 자주 묻는 질문",
    ]

    for item in toc_items:
        story.append(Paragraph(item, styles['TOCEntry']))

    story.append(PageBreak())

def create_login_section(story, styles):
    """1. 로그인 섹션"""
    story.append(Paragraph("1. 시작하기 - 로그인 및 로그아웃", styles['KoreanHeading1']))

    story.append(Paragraph(
        "TagHere Analytics에 접속하면 가장 먼저 로그인 화면이 나타납니다. "
        "아래의 자격증명을 사용하여 시스템에 로그인하세요.",
        styles['KoreanBody']
    ))

    add_screenshot(story, "01_login.png", "[그림 1-1] 로그인 화면", styles)

    story.append(Paragraph("로그인 방법", styles['KoreanHeading2']))
    story.append(Paragraph("① 아이디 입력란에 'taghere'를 입력합니다.", styles['KoreanBullet']))
    story.append(Paragraph("② 비밀번호 입력란에 '0614'를 입력합니다.", styles['KoreanBullet']))
    story.append(Paragraph("③ '로그인' 버튼을 클릭하거나 Enter 키를 누릅니다.", styles['KoreanBullet']))
    story.append(Paragraph("④ 로그인에 성공하면 대시보드 화면으로 이동합니다.", styles['KoreanBullet']))

    story.append(Paragraph("로그아웃 방법", styles['KoreanHeading2']))
    story.append(Paragraph(
        "화면 오른쪽 상단에 있는 '로그아웃' 버튼을 클릭하면 즉시 로그아웃됩니다. "
        "로그아웃 후에는 다시 로그인 화면이 표시됩니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph(
        "💡 팁: 로그인 정보는 브라우저에 저장되므로, 브라우저를 닫아도 로그인 상태가 유지됩니다. "
        "보안을 위해 공용 컴퓨터에서는 사용 후 반드시 로그아웃하세요.",
        styles['KoreanTip']
    ))

    story.append(PageBreak())

def create_dashboard_section(story, styles):
    """2. 대시보드 개요"""
    story.append(Paragraph("2. 대시보드 개요 - 전체 화면 구성", styles['KoreanHeading1']))

    story.append(Paragraph(
        "대시보드는 TagHere Analytics의 메인 화면입니다. 이 화면에서 매장 운영에 필요한 "
        "모든 핵심 정보를 한눈에 확인할 수 있습니다. 각 영역은 특정 목적을 가지고 있으며, "
        "상호 연동되어 종합적인 분석이 가능합니다.",
        styles['KoreanBody']
    ))

    add_screenshot(story, "02_dashboard_full.png", "[그림 2-1] 대시보드 전체 화면", styles)

    story.append(Paragraph("화면 구성 요소", styles['KoreanHeading2']))

    story.append(Paragraph("• KPI 카드 (상단): 6개의 핵심 성과 지표를 카드 형태로 표시합니다. "
                          "전체 거래액, 선결제액, 주문 수, 객단가, 활성 매장 수, 결제 성공률을 확인할 수 있습니다.",
                          styles['KoreanBullet']))

    story.append(Paragraph("• 날짜 필터 (상단 우측): 조회하고 싶은 기간을 선택합니다. "
                          "프리셋(오늘, 7일, 30일 등)을 선택하거나 원하는 날짜 범위를 직접 지정할 수 있습니다.",
                          styles['KoreanBullet']))

    story.append(Paragraph("• 매장 그룹 관리: 자주 조회하는 매장들을 그룹으로 저장하고, "
                          "해당 그룹만 필터링하여 볼 수 있습니다.",
                          styles['KoreanBullet']))

    story.append(Paragraph("• 수익 트렌드 차트: 시간에 따른 GMV(거래액)와 선결제액의 변화를 "
                          "라인 차트로 보여줍니다. 일별, 주별, 월별로 전환하여 볼 수 있습니다.",
                          styles['KoreanBullet']))

    story.append(Paragraph("• Top 데이터 테이블: GMV 기준 상위 매장, 판매량/매출 기준 상위 메뉴를 "
                          "순위별로 확인할 수 있습니다.",
                          styles['KoreanBullet']))

    story.append(Paragraph("• 메뉴 분석: 5개의 탭(순위, 기여도, 트렌드, 교차판매, 비교)으로 "
                          "메뉴별 상세 분석을 제공합니다.",
                          styles['KoreanBullet']))

    story.append(PageBreak())

def create_kpi_section(story, styles):
    """3. KPI 카드"""
    story.append(Paragraph("3. KPI 카드 - 핵심 성과 지표 이해하기", styles['KoreanHeading1']))

    story.append(Paragraph(
        "대시보드 상단에 위치한 6개의 KPI 카드는 선택한 기간 동안의 핵심 성과를 요약합니다. "
        "각 지표의 의미를 이해하면 매장 운영 상태를 빠르게 파악할 수 있습니다.",
        styles['KoreanBody']
    ))

    add_screenshot(story, "03_kpi_cards.png", "[그림 3-1] KPI 카드 영역", styles)

    story.append(Paragraph("각 KPI 카드 설명", styles['KoreanHeading2']))

    story.append(Paragraph("1. Total GMV (전체 거래액)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "GMV는 Gross Merchandise Value의 약자로, 선택한 기간 동안 발생한 모든 주문의 "
        "총 금액입니다. 할인, 환불 전의 원래 주문 금액을 합산한 값입니다. "
        "이 지표로 전체적인 매출 규모를 파악할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("2. Paid Amount (선결제액)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "실제로 결제가 완료된 금액입니다. orderStd(표준 주문) 타입의 매장에서 발생한 "
        "선결제 금액만 집계됩니다. GMV와 비교하여 결제 전환율을 파악할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("3. Total Orders (전체 주문 수)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "선택한 기간 동안 접수된 총 주문 건수입니다. 결제 여부와 관계없이 "
        "모든 주문이 포함됩니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("4. Avg Order Value (평균 주문 금액)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "객단가라고도 하며, 주문 1건당 평균 결제 금액입니다. "
        "Total GMV ÷ Total Orders로 계산됩니다. 이 지표가 높을수록 "
        "고객이 한 번에 더 많이 주문한다는 의미입니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("5. Active Stores (활성 매장 수)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "선택한 기간 동안 최소 1건 이상의 주문이 발생한 매장의 수입니다. "
        "전체 등록 매장 중 실제로 운영 중인 매장의 비율을 파악할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("6. Payment Success Rate (결제 성공률)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "전체 주문 중 결제가 성공적으로 완료된 비율입니다. 퍼센트(%)로 표시되며, "
        "이 비율이 낮다면 결제 시스템이나 사용자 경험에 문제가 있을 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

def create_date_filter_section(story, styles):
    """4. 날짜 필터"""
    story.append(Paragraph("4. 날짜 필터 - 조회 기간 설정하기", styles['KoreanHeading1']))

    story.append(Paragraph(
        "날짜 필터를 사용하면 대시보드에 표시되는 모든 데이터의 조회 기간을 변경할 수 있습니다. "
        "자주 사용하는 기간은 프리셋으로 빠르게 선택하고, 특정 기간이 필요하면 "
        "커스텀 모드로 직접 지정할 수 있습니다.",
        styles['KoreanBody']
    ))

    add_screenshot(story, "04_date_filter.png", "[그림 4-1] 날짜 필터", styles)

    story.append(Paragraph("프리셋 옵션 사용하기", styles['KoreanHeading2']))
    story.append(Paragraph(
        "날짜 필터 버튼을 클릭하면 다음과 같은 프리셋 옵션이 표시됩니다:",
        styles['KoreanBody']
    ))

    story.append(Paragraph("• Today: 오늘 하루의 데이터만 조회", styles['KoreanBullet']))
    story.append(Paragraph("• Last 7 Days: 최근 7일간 데이터 (어제부터 7일 전까지)", styles['KoreanBullet']))
    story.append(Paragraph("• Last 30 Days: 최근 30일간 데이터", styles['KoreanBullet']))
    story.append(Paragraph("• Last 90 Days: 최근 90일간 데이터 (약 3개월)", styles['KoreanBullet']))
    story.append(Paragraph("• Last 6 Months: 최근 6개월간 데이터", styles['KoreanBullet']))
    story.append(Paragraph("• Last Year: 최근 1년간 데이터", styles['KoreanBullet']))
    story.append(Paragraph("• This Month: 이번 달 1일부터 오늘까지", styles['KoreanBullet']))
    story.append(Paragraph("• Last Month: 지난 달 전체", styles['KoreanBullet']))
    story.append(Paragraph("• All Data: 2023년 1월 1일부터 현재까지 모든 데이터", styles['KoreanBullet']))

    story.append(Paragraph("커스텀 날짜 범위 사용하기", styles['KoreanHeading2']))
    story.append(Paragraph(
        "프리셋 옵션 외에 특정 기간을 직접 지정하려면 'Custom' 모드를 선택하세요. "
        "캘린더에서 시작일과 종료일을 클릭하여 원하는 기간을 설정할 수 있습니다. "
        "설정 후 '적용' 버튼을 클릭하면 해당 기간의 데이터가 로드됩니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph(
        "💡 팁: 데이터 양이 많을수록 로딩 시간이 길어질 수 있습니다. "
        "필요한 기간만 선택하여 조회하는 것이 효율적입니다.",
        styles['KoreanTip']
    ))

    story.append(PageBreak())

def create_chart_section(story, styles):
    """5. 수익 트렌드 차트"""
    story.append(Paragraph("6. 수익 트렌드 차트 - 매출 추이 분석", styles['KoreanHeading1']))

    story.append(Paragraph(
        "수익 트렌드 차트는 시간에 따른 GMV(거래액)와 선결제액의 변화를 시각적으로 보여줍니다. "
        "이 차트를 통해 매출의 상승/하락 추세, 계절적 패턴, 특정 이벤트의 영향 등을 파악할 수 있습니다.",
        styles['KoreanBody']
    ))

    add_screenshot(story, "05_revenue_chart.png", "[그림 6-1] 수익 트렌드 차트", styles)

    story.append(Paragraph("차트 읽는 방법", styles['KoreanHeading2']))
    story.append(Paragraph("• 파란색 선 (GMV): 전체 거래액의 변화를 나타냅니다.", styles['KoreanBullet']))
    story.append(Paragraph("• 초록색 선 (Paid Amount): 실제 결제 완료 금액의 변화를 나타냅니다.", styles['KoreanBullet']))
    story.append(Paragraph("• X축: 날짜 (선택한 그래뉼러리티에 따라 일/주/월 단위)", styles['KoreanBullet']))
    story.append(Paragraph("• Y축: 금액 (원화, KRW)", styles['KoreanBullet']))

    story.append(Paragraph("그래뉼러리티(집계 단위) 변경", styles['KoreanHeading2']))
    story.append(Paragraph(
        "차트 상단의 버튼으로 데이터 집계 단위를 변경할 수 있습니다:",
        styles['KoreanBody']
    ))
    story.append(Paragraph("• Daily (일별): 하루 단위로 데이터를 표시합니다. 단기간 분석에 적합합니다.", styles['KoreanBullet']))
    story.append(Paragraph("• Weekly (주별): 월요일 기준으로 주 단위 합계를 표시합니다. 주간 패턴 분석에 적합합니다.", styles['KoreanBullet']))
    story.append(Paragraph("• Monthly (월별): 월 단위 합계를 표시합니다. 장기간 추세 분석에 적합합니다.", styles['KoreanBullet']))

    story.append(Paragraph("차트 상호작용", styles['KoreanHeading2']))
    story.append(Paragraph(
        "차트 위에 마우스를 올리면 해당 날짜의 상세 수치를 툴팁으로 확인할 수 있습니다. "
        "범례(Legend)를 클릭하면 특정 선을 숨기거나 표시할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

def create_top_tables_section(story, styles):
    """6. Top 데이터 테이블"""
    story.append(Paragraph("7. Top 데이터 테이블 - 상위 매장/메뉴 확인", styles['KoreanHeading1']))

    story.append(Paragraph(
        "Top 데이터 테이블은 선택한 기간 동안 가장 실적이 좋은 매장과 메뉴를 순위별로 보여줍니다. "
        "3개의 탭으로 구성되어 있어, 다양한 기준으로 상위 항목을 확인할 수 있습니다.",
        styles['KoreanBody']
    ))

    add_screenshot(story, "06_top_tables.png", "[그림 7-1] Top 데이터 테이블", styles)

    story.append(Paragraph("탭 구성", styles['KoreanHeading2']))

    story.append(Paragraph("1. Top Stores by GMV (GMV 기준 상위 매장)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "거래액(GMV) 기준으로 상위 10개 매장을 표시합니다. 각 매장의 순위, 매장명, "
        "GMV, 주문 수를 확인할 수 있습니다. 어떤 매장이 가장 많은 매출을 올리고 있는지 파악하는 데 유용합니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("2. Top Menus by Quantity (판매량 기준 상위 메뉴)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "판매 수량 기준으로 상위 10개 메뉴를 표시합니다. 가장 많이 팔린 인기 메뉴를 확인할 수 있습니다. "
        "메뉴 구성이나 재고 관리에 참고할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("3. Top Menus by Revenue (매출 기준 상위 메뉴)", styles['KoreanHeading3']))
    story.append(Paragraph(
        "매출액 기준으로 상위 10개 메뉴를 표시합니다. 판매량은 적더라도 단가가 높아 "
        "매출 기여도가 높은 메뉴를 파악할 수 있습니다. 수익성 분석에 유용합니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph(
        "💡 팁: 판매량 Top 메뉴와 매출 Top 메뉴가 다를 수 있습니다. "
        "두 탭을 비교하면 고단가 메뉴와 저단가 인기 메뉴를 구분할 수 있습니다.",
        styles['KoreanTip']
    ))

    story.append(PageBreak())

def create_menu_analysis_section(story, styles):
    """7. 메뉴 분석"""
    story.append(Paragraph("8. 메뉴 분석", styles['KoreanHeading1']))

    story.append(Paragraph(
        "메뉴 분석 섹션은 5개의 탭으로 구성되어 있으며, 다양한 관점에서 메뉴 성과를 "
        "심층 분석할 수 있습니다. 상단의 검색창에서 특정 메뉴명을 입력하면 해당 메뉴만 필터링됩니다.",
        styles['KoreanBody']
    ))

    # 8.1 순위
    story.append(Paragraph("8.1 순위 (Rankings) - 판매량/매출 기준 Top 메뉴", styles['KoreanHeading2']))
    add_screenshot(story, "07_menu_rankings.png", "[그림 8-1] 메뉴 순위 탭", styles)

    story.append(Paragraph("이 탭에서 확인할 수 있는 정보:", styles['KoreanHeading3']))
    story.append(Paragraph("• 판매량 기준 Top 10: 가장 많이 판매된 메뉴 순위", styles['KoreanBullet']))
    story.append(Paragraph("• 매출 기준 Top 10: 가장 높은 매출을 올린 메뉴 순위", styles['KoreanBullet']))
    story.append(Paragraph("• 각 메뉴별 상세 정보: 판매량, 매출, 주문 수, 평균 단가", styles['KoreanBullet']))

    story.append(Paragraph(
        "활용 방법: 인기 메뉴를 파악하여 프로모션 대상을 선정하거나, "
        "저조한 메뉴의 개선 방안을 모색할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

    # 8.2 기여도
    story.append(Paragraph("8.2 기여도 (Revenue Contribution) - 파레토 분석", styles['KoreanHeading2']))
    add_screenshot(story, "08_menu_contribution.png", "[그림 8-2] 매출 기여도 탭", styles)

    story.append(Paragraph("이 탭에서 확인할 수 있는 정보:", styles['KoreanHeading3']))
    story.append(Paragraph("• 파레토 차트: 메뉴별 매출 기여도를 시각화", styles['KoreanBullet']))
    story.append(Paragraph("• 개별 기여도 (%): 각 메뉴가 전체 매출에서 차지하는 비율", styles['KoreanBullet']))
    story.append(Paragraph("• 누적 기여도 (%): 상위 메뉴부터 누적했을 때의 비율", styles['KoreanBullet']))

    story.append(Paragraph(
        "활용 방법: 파레토 법칙(80/20 법칙)에 따라 상위 20% 메뉴가 80% 매출을 차지하는지 확인할 수 있습니다. "
        "핵심 메뉴에 집중하여 운영 효율을 높일 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

    # 8.3 트렌드
    story.append(Paragraph("8.3 트렌드 (Menu Trend) - 메뉴별 판매 추이", styles['KoreanHeading2']))
    add_screenshot(story, "09_menu_trends.png", "[그림 8-3] 메뉴 트렌드 탭", styles)

    story.append(Paragraph("이 탭에서 확인할 수 있는 정보:", styles['KoreanHeading3']))
    story.append(Paragraph("• 라인 차트: 상위 5개 메뉴의 일별 판매 추이", styles['KoreanBullet']))
    story.append(Paragraph("• 성장률: 각 메뉴의 기간 대비 성장/감소율", styles['KoreanBullet']))
    story.append(Paragraph("• 일평균 판매량: 하루 평균 몇 개가 판매되는지", styles['KoreanBullet']))

    story.append(Paragraph(
        "활용 방법: 특정 메뉴의 인기가 상승 중인지, 하락 중인지 파악할 수 있습니다. "
        "계절적 요인이나 프로모션 효과를 분석하는 데 유용합니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

    # 8.4 교차판매
    story.append(Paragraph("8.4 교차판매 (Cross-Selling) - 함께 팔리는 메뉴", styles['KoreanHeading2']))
    add_screenshot(story, "10_menu_cross_selling.png", "[그림 8-4] 교차판매 분석 탭", styles)

    story.append(Paragraph("이 탭에서 확인할 수 있는 정보:", styles['KoreanHeading3']))
    story.append(Paragraph("• 메뉴 쌍: 같은 주문에서 함께 주문된 메뉴 조합", styles['KoreanBullet']))
    story.append(Paragraph("• 동시 발생 횟수: 두 메뉴가 함께 주문된 횟수", styles['KoreanBullet']))
    story.append(Paragraph("• Confidence (신뢰도): A를 주문한 고객이 B도 주문할 확률", styles['KoreanBullet']))
    story.append(Paragraph("• Lift (연관도): 두 메뉴의 연관성 강도 (1보다 크면 양의 연관)", styles['KoreanBullet']))

    story.append(Paragraph("Lift 값 해석:", styles['KoreanHeading3']))
    story.append(Paragraph("• Lift < 1: 음의 연관 (함께 주문되는 경향이 낮음)", styles['KoreanBullet']))
    story.append(Paragraph("• Lift = 1: 연관 없음 (독립적)", styles['KoreanBullet']))
    story.append(Paragraph("• Lift 1~1.5: 약한 양의 연관", styles['KoreanBullet']))
    story.append(Paragraph("• Lift 1.5~2: 중간 정도의 연관", styles['KoreanBullet']))
    story.append(Paragraph("• Lift > 2: 강한 양의 연관 (함께 주문되는 경향이 높음)", styles['KoreanBullet']))

    story.append(Paragraph(
        "활용 방법: 세트 메뉴 구성, 추천 메뉴 제안, 테이블 배치 등에 활용할 수 있습니다. "
        "Lift가 높은 메뉴 쌍을 세트로 묶으면 판매량 증가를 기대할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

    # 8.5 판매량 비교
    story.append(Paragraph("8.5 판매량 비교 (Menu Comparison) - 메뉴간 비교", styles['KoreanHeading2']))
    add_screenshot(story, "11_menu_comparison.png", "[그림 8-5] 판매량 비교 탭", styles)

    story.append(Paragraph("이 탭에서 확인할 수 있는 정보:", styles['KoreanHeading3']))
    story.append(Paragraph("• 선택한 메뉴들의 매장별 판매량 비교", styles['KoreanBullet']))
    story.append(Paragraph("• 파이 차트로 각 메뉴의 판매 비율 시각화", styles['KoreanBullet']))
    story.append(Paragraph("• 여러 매장 선택 시 매장별로 분리 표시", styles['KoreanBullet']))

    story.append(Paragraph("사용 방법:", styles['KoreanHeading3']))
    story.append(Paragraph("① 검색창에서 비교하고 싶은 메뉴를 검색합니다.", styles['KoreanBullet']))
    story.append(Paragraph("② 검색 결과에서 메뉴를 클릭하여 선택합니다 (여러 개 선택 가능).", styles['KoreanBullet']))
    story.append(Paragraph("③ 선택한 메뉴들의 판매량이 차트로 비교됩니다.", styles['KoreanBullet']))

    story.append(Paragraph(
        "활용 방법: 경쟁 메뉴 간의 판매 성과를 비교하거나, 신메뉴와 기존 메뉴의 성과 차이를 분석할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

def create_explore_section(story, styles):
    """8. 탐색 페이지"""
    story.append(Paragraph("9. 탐색 페이지", styles['KoreanHeading1']))

    story.append(Paragraph(
        "탐색 페이지는 상단 네비게이션의 '탐색' 메뉴를 클릭하여 접근할 수 있습니다. "
        "이 페이지에서는 메뉴로 매장을 검색하거나, 데이터베이스 구조를 확인할 수 있습니다.",
        styles['KoreanBody']
    ))

    # 9.1 메뉴 검색
    story.append(Paragraph("9.1 메뉴 검색 - 메뉴로 매장 찾기", styles['KoreanHeading2']))
    add_screenshot(story, "12_explore_menu_search.png", "[그림 9-1] 메뉴 검색 화면", styles)

    story.append(Paragraph("기능 설명:", styles['KoreanHeading3']))
    story.append(Paragraph(
        "특정 메뉴를 판매하는 매장을 검색할 수 있습니다. 예를 들어 '테라'를 검색하면 "
        "테라 맥주를 판매하는 모든 매장과 각 매장의 판매량, 매출을 확인할 수 있습니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("단일 메뉴 검색:", styles['KoreanHeading3']))
    story.append(Paragraph("① 검색창에 메뉴명을 입력합니다 (예: '테라').", styles['KoreanBullet']))
    story.append(Paragraph("② 검색 버튼을 클릭하거나 Enter를 누릅니다.", styles['KoreanBullet']))
    story.append(Paragraph("③ 해당 메뉴를 판매하는 매장 목록이 표시됩니다.", styles['KoreanBullet']))
    story.append(Paragraph("④ 매장별 순위, 판매량, 매출, 주문 수, 활성일수를 확인합니다.", styles['KoreanBullet']))

    story.append(Paragraph("다중 메뉴 검색 (교집합):", styles['KoreanHeading3']))
    story.append(Paragraph(
        "쉼표(,)로 구분하여 여러 메뉴를 동시에 검색할 수 있습니다. "
        "예: '테라, 켈리' 검색 시 테라와 켈리를 모두 판매하는 매장만 표시됩니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("CSV 다운로드:", styles['KoreanHeading3']))
    story.append(Paragraph(
        "검색 결과 우측의 'CSV 다운로드' 버튼을 클릭하면 현재 검색 결과를 "
        "Excel에서 열 수 있는 CSV 파일로 내보낼 수 있습니다. "
        "한글 깨짐 방지를 위해 UTF-8 BOM이 포함됩니다.",
        styles['KoreanBody']
    ))

    story.append(PageBreak())

    # 9.2 스키마 탐색
    story.append(Paragraph("9.2 스키마 탐색 - 데이터 구조 확인", styles['KoreanHeading2']))
    add_screenshot(story, "13_explore_schema.png", "[그림 9-2] 스키마 탐색 화면", styles)

    story.append(Paragraph("기능 설명:", styles['KoreanHeading3']))
    story.append(Paragraph(
        "MongoDB 데이터베이스의 구조를 탐색할 수 있습니다. "
        "개발자나 데이터 분석가가 데이터 구조를 파악할 때 유용합니다.",
        styles['KoreanBody']
    ))

    story.append(Paragraph("사용 방법:", styles['KoreanHeading3']))
    story.append(Paragraph("① 'Load Collections' 버튼을 클릭하여 컬렉션 목록을 불러옵니다.", styles['KoreanBullet']))
    story.append(Paragraph("② 드롭다운에서 탐색할 컬렉션을 선택합니다.", styles['KoreanBullet']))
    story.append(Paragraph("③ 컬렉션 정보(문서 수, 필드 수, 인덱스 수)가 표시됩니다.", styles['KoreanBullet']))
    story.append(Paragraph("④ 필드 테이블에서 각 필드의 타입, 샘플 값, Null 개수를 확인합니다.", styles['KoreanBullet']))
    story.append(Paragraph("⑤ 인덱스 정보에서 쿼리 최적화에 활용할 수 있는 인덱스를 확인합니다.", styles['KoreanBullet']))

    story.append(PageBreak())

def create_sync_section(story, styles):
    """9. 데이터 동기화"""
    story.append(Paragraph("10. 데이터 동기화 - 최신 데이터 가져오기", styles['KoreanHeading1']))

    story.append(Paragraph(
        "데이터 동기화 기능은 MongoDB의 최신 데이터를 SQLite 캐시로 동기화합니다. "
        "이 기능은 관리자만 사용할 수 있으며, 대시보드 하단에서 접근할 수 있습니다.",
        styles['KoreanBody']
    ))

    add_screenshot(story, "14_data_sync.png", "[그림 10-1] 데이터 동기화 영역", styles)

    story.append(Paragraph("동기화가 필요한 경우", styles['KoreanHeading2']))
    story.append(Paragraph("• 대시보드에 최신 데이터가 반영되지 않을 때", styles['KoreanBullet']))
    story.append(Paragraph("• 새로운 매장이나 메뉴가 추가된 후", styles['KoreanBullet']))
    story.append(Paragraph("• 시스템 장애 복구 후 데이터 정합성 확인이 필요할 때", styles['KoreanBullet']))

    story.append(Paragraph("동기화 방법", styles['KoreanHeading2']))
    story.append(Paragraph("① 대시보드 페이지 하단으로 스크롤합니다.", styles['KoreanBullet']))
    story.append(Paragraph("② '최신 데이터 가져오기' 버튼을 클릭합니다.", styles['KoreanBullet']))
    story.append(Paragraph("③ 다이얼로그가 열리면 비밀번호를 입력합니다: 0614", styles['KoreanBullet']))
    story.append(Paragraph("④ '동기화 시작' 버튼을 클릭합니다.", styles['KoreanBullet']))
    story.append(Paragraph("⑤ 진행 상태가 표시되며, 완료되면 결과가 나타납니다.", styles['KoreanBullet']))
    story.append(Paragraph("⑥ 동기화 완료 후 다이얼로그가 자동으로 닫힙니다.", styles['KoreanBullet']))

    story.append(Paragraph("동기화 진행 단계", styles['KoreanHeading2']))
    story.append(Paragraph("1단계: 인증 확인 중 - 비밀번호 검증", styles['KoreanBullet']))
    story.append(Paragraph("2단계: MongoDB 연결 중 - 데이터베이스 연결", styles['KoreanBullet']))
    story.append(Paragraph("3단계: 최신 데이터 조회 중 - 변경된 데이터 검색", styles['KoreanBullet']))
    story.append(Paragraph("4단계: SQLite 캐시 업데이트 중 - 로컬 캐시에 저장", styles['KoreanBullet']))
    story.append(Paragraph("5단계: 완료 - 동기화 결과 표시", styles['KoreanBullet']))

    story.append(Paragraph(
        "⚠️ 주의: 데이터 동기화는 MongoDB 서버에 부하를 줄 수 있습니다. "
        "가능하면 이용자가 적은 시간대(새벽 또는 점심시간)에 실행하는 것을 권장합니다. "
        "동기화 중에는 브라우저를 닫지 마세요.",
        styles['KoreanTip']
    ))

    story.append(PageBreak())

def create_faq_section(story, styles):
    """10. 문제 해결"""
    story.append(Paragraph("11. 문제 해결 - 자주 묻는 질문", styles['KoreanHeading1']))

    story.append(Paragraph(
        "TagHere Analytics 사용 중 자주 발생하는 문제와 해결 방법을 안내합니다.",
        styles['KoreanBody']
    ))

    # FAQ 1
    story.append(Paragraph("Q1. 데이터가 표시되지 않습니다.", styles['KoreanHeading2']))
    story.append(Paragraph(
        "원인: 선택한 기간에 데이터가 없거나, 네트워크 연결 문제일 수 있습니다.",
        styles['KoreanBody']
    ))
    story.append(Paragraph("해결 방법:", styles['KoreanHeading3']))
    story.append(Paragraph("• 날짜 필터에서 'All Data'를 선택하여 전체 기간 데이터를 확인해 보세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 브라우저를 새로고침(F5)하세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 인터넷 연결 상태를 확인하세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 문제가 지속되면 데이터 동기화를 실행해 보세요.", styles['KoreanBullet']))

    # FAQ 2
    story.append(Paragraph("Q2. 로그인에 실패합니다.", styles['KoreanHeading2']))
    story.append(Paragraph(
        "원인: 아이디 또는 비밀번호가 잘못 입력되었습니다.",
        styles['KoreanBody']
    ))
    story.append(Paragraph("해결 방법:", styles['KoreanHeading3']))
    story.append(Paragraph("• 아이디: taghere (모두 소문자)", styles['KoreanBullet']))
    story.append(Paragraph("• 비밀번호: 0614 (숫자)", styles['KoreanBullet']))
    story.append(Paragraph("• Caps Lock이 켜져 있지 않은지 확인하세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 입력 전후에 공백이 없는지 확인하세요.", styles['KoreanBullet']))

    # FAQ 3
    story.append(Paragraph("Q3. 차트가 로딩되지 않거나 깨져 보입니다.", styles['KoreanHeading2']))
    story.append(Paragraph(
        "원인: 브라우저 캐시 문제이거나, 데이터 로딩 중 오류가 발생했을 수 있습니다.",
        styles['KoreanBody']
    ))
    story.append(Paragraph("해결 방법:", styles['KoreanHeading3']))
    story.append(Paragraph("• 브라우저 캐시를 삭제하세요 (Ctrl+Shift+Delete).", styles['KoreanBullet']))
    story.append(Paragraph("• 다른 브라우저(Chrome, Firefox, Safari)로 시도해 보세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 페이지를 새로고침하세요.", styles['KoreanBullet']))

    # FAQ 4
    story.append(Paragraph("Q4. 특정 매장 데이터만 보고 싶습니다.", styles['KoreanHeading2']))
    story.append(Paragraph(
        "해결 방법: 매장 그룹 기능을 사용하세요.",
        styles['KoreanBody']
    ))
    story.append(Paragraph("① 대시보드 상단의 매장 검색창에서 원하는 매장을 검색합니다.", styles['KoreanBullet']))
    story.append(Paragraph("② 검색 결과에서 매장을 선택합니다.", styles['KoreanBullet']))
    story.append(Paragraph("③ '그룹 생성' 버튼으로 그룹을 저장합니다.", styles['KoreanBullet']))
    story.append(Paragraph("④ 저장된 그룹 태그를 클릭하면 해당 매장만 필터링됩니다.", styles['KoreanBullet']))

    # FAQ 5
    story.append(Paragraph("Q5. CSV 다운로드가 작동하지 않습니다.", styles['KoreanHeading2']))
    story.append(Paragraph(
        "원인: 브라우저의 다운로드 설정 또는 팝업 차단 기능이 원인일 수 있습니다.",
        styles['KoreanBody']
    ))
    story.append(Paragraph("해결 방법:", styles['KoreanHeading3']))
    story.append(Paragraph("• 브라우저의 다운로드 폴더 설정을 확인하세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 팝업 차단이 활성화되어 있다면 해당 사이트를 예외로 추가하세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 다른 브라우저로 시도해 보세요.", styles['KoreanBullet']))

    # FAQ 6
    story.append(Paragraph("Q6. 데이터가 최신이 아닌 것 같습니다.", styles['KoreanHeading2']))
    story.append(Paragraph(
        "원인: 캐시된 데이터를 표시하고 있을 수 있습니다.",
        styles['KoreanBody']
    ))
    story.append(Paragraph("해결 방법:", styles['KoreanHeading3']))
    story.append(Paragraph("• 날짜 필터 옆에 'Cached' 배지가 표시되면 캐시 데이터입니다.", styles['KoreanBullet']))
    story.append(Paragraph("• 대시보드 하단의 '최신 데이터 가져오기'로 동기화하세요.", styles['KoreanBullet']))
    story.append(Paragraph("• 동기화 후 페이지를 새로고침하세요.", styles['KoreanBullet']))

    story.append(Spacer(1, 1*cm))

    story.append(Paragraph("추가 지원", styles['KoreanHeading2']))
    story.append(Paragraph(
        "위의 방법으로 해결되지 않는 문제가 있다면 시스템 관리자에게 문의해 주세요. "
        "문의 시 발생한 문제, 사용 중인 브라우저, 에러 메시지(있다면)를 함께 알려주시면 "
        "빠른 해결에 도움이 됩니다.",
        styles['KoreanBody']
    ))

def create_manual():
    """PDF 매뉴얼 생성"""
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    styles = create_styles()
    story = []

    print("매뉴얼 생성 시작...")

    # 각 섹션 생성
    print("  - 표지 생성")
    create_cover_page(story, styles)

    print("  - 목차 생성")
    create_toc(story, styles)

    print("  - 1. 로그인 섹션")
    create_login_section(story, styles)

    print("  - 2. 대시보드 개요")
    create_dashboard_section(story, styles)

    print("  - 3. KPI 카드")
    create_kpi_section(story, styles)

    print("  - 4. 날짜 필터")
    create_date_filter_section(story, styles)

    print("  - 5. 수익 트렌드 차트")
    create_chart_section(story, styles)

    print("  - 6. Top 데이터 테이블")
    create_top_tables_section(story, styles)

    print("  - 7. 메뉴 분석")
    create_menu_analysis_section(story, styles)

    print("  - 8. 탐색 페이지")
    create_explore_section(story, styles)

    print("  - 9. 데이터 동기화")
    create_sync_section(story, styles)

    print("  - 10. 문제 해결")
    create_faq_section(story, styles)

    # PDF 빌드
    print("PDF 빌드 중...")
    doc.build(story)
    print(f"\n✅ PDF 매뉴얼이 생성되었습니다: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_manual()
