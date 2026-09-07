Phase 1: Creating the UPS Application & Visual Design System
=======
Build the foundation for an enterprise AI Code Reviewer dashboard for United Parcel Service (UPS), titled "UPS Code Reviewer". 

Create a professional, modern enterprise theme using official UPS brand colors: deep UPS brown (#231F20 and #1b1b1b) for the background, 
vibrant UPS gold/yellow (#FFB500) for primary highlights, crisp white text, and subtle dark-mode structural grid lines. Implement clean 
corporate typography with custom glowing gold scrollbars and smooth box shadows.



Phase 2: Building the Sticky UPS Header & Navigation Bar
=======
Add a sleek, professional glassmorphic navigation bar pinned to the top of the UPS dashboard.

Include the UPS Shield logo icon on the left with the brand title "UPS CodeReview" in bold text, accompanied by a gold shield accent.

In the middle, add navigation links for "Dashboard" (active state), "Git Repository", "Review History", and "API Docs" with smooth gold hover highlights.

On the right, add an n8n connection status badge showing "n8n Connected" with a pulsing green light dot, and a circular user profile avatar with initials "SS". Give the navigation bar a translucent dark frosted glass look with a subtle UPS gold bottom border.

Phase 3: Building the 2-Column UPS Dashboard & Control Sideba
========
Create a two-column dashboard layout with a control sidebar on the left and a main review workspace on the right, themed for UPS.

In the left sidebar, add a glass card titled "Code Review Control". Place an input field with a link icon for typing a GitHub raw or repository file URL (placeholder: "https://raw.githubusercontent.com/..."), 3 pre-checked module option checkboxes (Code Readability, Efficiency & Robustness, Best Practices), and a full-width gradient UPS gold "Review Code" button that shimmers on hover. Below this, add an enterprise upgrade card.

At the top of the right workspace, add 3 metric summary cards showing "1 File Checked", "88% Avg Quality Score", and "Active webhook Sync" with distinct UPS gold, amber, and green glowing icons. Ensure the layout neatly stacks vertically on mobile screens.

Phase 4: Designing the UPS Review Workspace & Loading Effects
========
In the right workspace panel, build a large glass card titled "Review Workspace" for displaying AI code reviews fetched via webhook.

By default, display a friendly waiting screen with concentric dashed cyber rings spinning around a pulsing UPS shield icon, asking the user to enter a GitHub file URL and click "Review Code".

Design a dynamic loading state for when an analysis is running: show a glowing UPS gold laser scan line moving top-to-bottom across the card and an animated status progress ticker. Also add a smooth horizontal shake animation for errors.

Phase 5: Interactive Input Validation, Webhook Connection & Error Handling
========
Make the dashboard fully interactive:
1. Validate that the URL input field is not empty on submission; if empty, highlight red, trigger a card shake animation, and display a warning message[cite: 1].
2. On valid submission, lock the form controls, change button text to "Analyzing Code...", and activate the UPS gold laser scanning beam.
3. Execute an asynchronous POST request to URL (User input from chat as webhook url :) with JSON payload { "url": urlInput }[cite: 2].
4. Implement robust error handling to catch unreachable server states and display clear error messages without breaking the layout.

Phase 6: Dynamic URL Binding, Webhook Configuration & UI Integration
========
Update the frontend submission handler and n8n webhook configuration so that:
1. The URL entered in the UPS UI input box is captured dynamically and sent as a JSON body { "url": "user_entered_url" } via a POST request to (User uRL in chat).
2. The n8n HTTP Request node successfully retrieves the payload using the expression {{ $json.body.url }} with the GET method.
3. The frontend parses the resulting LLM review output into proportioned, responsive HTML tables with explicit cell widths and displays it seamlessly within the review workspace card, concluding with an "ANALYSIS COMPLETE" badge.