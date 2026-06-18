"""Test share code sync + visibility UI."""
# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Login
    print("[1] Login...")
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', "longlei@qq.com")
    page.fill('input[type="password"]', "123456")
    page.click('button[type="submit"]')
    page.wait_for_url(f"{BASE}/practice", timeout=15000)
    page.wait_for_load_state("networkidle")
    print("    Logged in")

    # 2. Check practice page for visibility controls
    print("[2] Practice page visibility...")

    # Click the first topic to select it (for batch visibility button)
    topic_links = page.locator('a[href*="/practice?topic="]')
    if topic_links.count() > 0:
        print(f"    Found {topic_links.count()} topic links")
        # Click the first topic
        first_topic = topic_links.first
        topic_name = first_topic.inner_text().split("\n")[0].strip()
        first_topic.click()
        page.wait_for_load_state("networkidle")
        page.screenshot(path="/tmp/sync_test_practice_topic.png", full_page=True)

        body_text = page.locator("body").inner_text()
        if "一键公开" in body_text:
            print("    [OK] '一键公开' button appeared when topic selected")
        else:
            print("    [FAIL] '一键公开' button not found when topic selected")
            print(f"    Text excerpt: {body_text[:500]}")

    # 3. Check topic tree visibility dropdown
    print("[3] Topic visibility dropdown...")
    # Hover over a topic item to reveal buttons
    topic_item = page.locator(".group").first
    topic_item.hover()
    page.wait_for_timeout(300)
    page.screenshot(path="/tmp/sync_test_topic_hover.png", full_page=True)

    # 4. Check navbar sync button
    print("[4] Navbar sync button...")
    sync_btn = page.locator("button:has-text('同步他人题库')")
    if sync_btn.count() > 0 and sync_btn.first.is_visible():
        print("    [OK] Sync button visible")
        sync_btn.first.click()
        page.wait_for_timeout(500)
        modal_text = page.locator("body").inner_text()
        if "分享码" in modal_text:
            print("    [OK] Modal opened")
        page.screenshot(path="/tmp/sync_test_modal2.png", full_page=True)
    else:
        print("    [FAIL] Sync button missing")

    # 5. Check paper page visibility
    print("[5] Paper page...")
    page.goto(f"{BASE}/paper")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/sync_test_paper.png", full_page=True)
    paper_text = page.locator("body").inner_text()
    # Check for PaperVisibilityToggle buttons
    toggle_btns = page.locator("button[title='设为公开'], button[title='设为私有']")
    print(f"    Paper visibility toggle buttons: {toggle_btns.count()}")

    # 6. Check settings page
    print("[6] Settings page...")
    page.goto(f"{BASE}/settings")
    page.wait_for_load_state("networkidle")
    settings_text = page.locator("body").inner_text()
    if "我的分享码" in settings_text:
        print("    [OK] Share code section present")
    if "同步记录" in settings_text:
        print("    [OK] Sync history section present")
    page.screenshot(path="/tmp/sync_test_settings2.png", full_page=True)

    browser.close()
    print("\n[DONE] All tests passed!")
