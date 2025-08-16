import os
import tempfile
import json
from playwright.sync_api import sync_playwright, expect

def verify_data_table_preview():
    with sync_playwright() as p:
        # Create a temporary directory for the user data to ensure a clean session
        user_data_dir = tempfile.mkdtemp()
        
        # Path to the extension code
        extension_path = os.path.abspath('.')

        # Launch a persistent browser context with the extension loaded
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=True,
            args=[
                f"--disable-extensions-except={extension_path}",
                f"--load-extension={extension_path}",
            ],
        )

        # Find the background page to get the extension ID
        background_page = None
        # Wait for the background page to appear and get a reference to it.
        background_page = context.wait_for_event("backgroundpage")

        if not background_page:
            raise Exception("Could not find the extension's background page.")
        extension_id = background_page.url.split('/')[2]

        # Inject sample data into chrome.storage.local
        sample_data = {
            "scrapedData": {
                "emails": ["test1@example.com", "test2@example.com"],
                "phones": ["111-222-3333"],
                "products": [
                    {"name": "Cool Widget", "price": "19.99"},
                    {"name": "Awesome Gadget", "price": "29.99"}
                ]
            }
        }
        
        # Use a reliable way to set storage
        background_page.evaluate(f"""
        () => {{
            chrome.storage.local.set({json.dumps(sample_data)});
        }}
        """)
        
        # Open the popup in a new tab
        popup_url = f"chrome-extension://{extension_id}/popup.html"
        page = context.new_page()
        page.goto(popup_url, wait_until="domcontentloaded")

        # Navigate to the "Export" tab
        export_tab = page.locator('[data-tab="export"]')
        export_tab.click()

        # Wait for the preview container to be populated
        preview_container = page.locator('#data-preview-container')
        
        # We expect the table to appear
        expect(preview_container.locator('table')).to_be_visible(timeout=5000)
        
        # Check for some content in the table
        expect(preview_container.locator('td:has-text("emails")')).to_be_visible()
        expect(preview_container.locator('td:has-text("test1@example.com")')).to_be_visible()
        expect(preview_container.locator('td:has-text("products")')).to_be_visible()
        expect(preview_container.locator('td:has-text("Cool Widget")')).to_be_visible()

        # Take a screenshot of the popup content
        page.screenshot(path="jules-scratch/verification/data_table_preview.png")

        # Close the context
        context.close()

if __name__ == "__main__":
    # First, let's make sure playwright is installed
    # Using a quiet install to keep logs clean
    os.system("pip install -q playwright")
    os.system("playwright install --with-deps")
    verify_data_table_preview()
