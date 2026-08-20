/**
 * Collection of default prompts for different use cases (ICE POT Format)
 */
export const DEFAULT_PROMPTS = {
 
  /**
   * Selenium Java Page Object Prompt (No Test Class)
   */
  SELENIUM_JAVA_PAGE_ONLY: `
    Instructions:
    - Generate ONLY a Selenium Java Page Object Class (no test code).
    - The output must be production-grade, reusable, and enterprise-ready for a mature QA automation framework.
    - Use @FindBy annotations with proper locator strategies: id, name, xpath, css, className, linkText, partialLinkText.
    - Prefer id and name over xpath when available; use xpath only for complex DOM structures.
    - Initialize WebDriver and WebDriverWait in the constructor using PageFactory.initElements().
    - Add explicit waits (WebDriverWait with ExpectedConditions) for every element interaction.
    - Never use Thread.sleep() or hardcoded waits—only explicit waits.
    - Include a waitForPageLoad() method to verify page readiness before executing actions.
    - Add JavaDoc for the class, constructor, and every public method.
    - Use meaningful, action-oriented method names (e.g., enterEmail, clickLogin, verifyErrorMessage).
    - Return typed values from methods when appropriate (WebElement, boolean, String).
    - Include error handling: catch StaleElementReferenceException and ElementNotFoundException where applicable.
    - Keep the class generic enough for reuse across flows, but specific to the actual DOM provided.
    - Do not include test cases, explanatory comments, or "TODO" placeholders.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example structure to follow:
    \`\`\`java
    package com.testleaf.pages;

    import org.openqa.selenium.*;
    import org.openqa.selenium.support.FindBy;
    import org.openqa.selenium.support.PageFactory;
    import org.openqa.selenium.support.ui.ExpectedConditions;
    import org.openqa.selenium.support.ui.WebDriverWait;
    import java.time.Duration;

    /**
     * Page Object for Login Page.
     * Provides methods to interact with login form elements.
     */
    public class LoginPage {
        private final WebDriver driver;
        private final WebDriverWait wait;

        @FindBy(id = "email")
        private WebElement emailInput;

        @FindBy(id = "password")
        private WebElement passwordInput;

        @FindBy(xpath = "//button[contains(text(), 'Login')]")
        private WebElement loginButton;

        @FindBy(className = "error-message")
        private WebElement errorMessage;

        /**
         * Constructor to initialize WebDriver and PageFactory.
         * @param driver WebDriver instance
         */
        public LoginPage(WebDriver driver) {
            this.driver = driver;
            this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            PageFactory.initElements(driver, this);
        }

        /**
         * Wait for the login page to fully load.
         */
        public void waitForPageLoad() {
            try {
                wait.until(ExpectedConditions.visibilityOf(emailInput));
            } catch (TimeoutException e) {
                throw new RuntimeException("Login page failed to load within timeout", e);
            }
        }

        /**
         * Enter email into the email input field with explicit wait.
         * @param email Email address to enter
         */
        public void enterEmail(String email) {
            WebElement element = wait.until(ExpectedConditions.elementToBeClickable(emailInput));
            element.clear();
            element.sendKeys(email);
        }

        /**
         * Enter password into the password field with explicit wait.
         * @param password Password to enter
         */
        public void enterPassword(String password) {
            WebElement element = wait.until(ExpectedConditions.elementToBeClickable(passwordInput));
            element.clear();
            element.sendKeys(password);
        }

        /**
         * Click the login button with explicit wait for clickability.
         */
        public void clickLogin() {
            WebElement element = wait.until(ExpectedConditions.elementToBeClickable(loginButton));
            element.click();
        }

        /**
         * Check if error message is displayed.
         * @return true if error message is visible, false otherwise
         */
        public boolean isErrorMessageDisplayed() {
            try {
                return wait.until(ExpectedConditions.visibilityOf(errorMessage)).isDisplayed();
            } catch (TimeoutException e) {
                return false;
            }
        }
    }
    \`\`\`

    Persona:
    - Audience: Senior QA automation engineers building maintainable and scalable Selenium frameworks.

    Output Format:
    - A single Java class inside a \`\`\`java\`\`\` block.

    Tone:
    - Professional, maintainable, enterprise-ready, scalable, resilient.
  `,

  /**
   * Cucumber Feature File Only Prompt
   */
  CUCUMBER_ONLY: `
    Instructions:
    - Generate ONLY a Cucumber (.feature) file.
    - Use Scenario Outline with Examples table.
    - Make sure every step is relevant to the provided DOM.
    - Do not combine multiple actions into one step.
    - Use South India realistic dataset (names, addresses, pin codes, mobile numbers).
    - Use dropdown values only from provided DOM.
    - Generate multiple scenarios if applicable.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "testuser" | "testpass"|
      | "admin"    | "admin123"|
    \`\`\`

    Persona:
    - Audience: BDD testers who only need feature files.

    Output Format:
    - Only valid Gherkin in a \`\`\`gherkin\`\`\` block.

    Tone:
    - Clear, structured, executable.
  `,

  /**
   * Cucumber with Step Definitions (Selenium Java)
   */
  CUCUMBER_WITH_SELENIUM_JAVA_STEPS: `
    Instructions:
    - Generate BOTH:
      1. A Cucumber .feature file.
      2. A Java step definition class for Selenium.
    - Do NOT include Page Object code in the step defs; keep them clean and focused on step logic.
    - Step defs must include WebDriver setup, explicit waits, and proper Selenium patterns.
    - Use @io.cucumber.java.Before and @io.cucumber.java.After for driver lifecycle management.
    - Implement explicit waits (WebDriverWait with ExpectedConditions) for every element interaction.
    - Never use Thread.sleep() or hardcoded waits—only explicit waits.
    - Use By.id, By.name, or By.xpath for locators depending on DOM availability.
    - Include error handling: catch NoSuchElementException and TimeoutException where applicable.
    - Use Scenario Outline with Examples table for data-driven testing.
    - Use South India realistic dataset (names, addresses, pin codes, mobile numbers).
    - Keep step implementations concise and readable; delegate complex logic to helper methods if needed.
    - Do not include explanatory comments or TODOs.
    - Follow standard Cucumber Scenario Outline patterns with clear step definitions.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | admin      | admin123  |
      | testuser   | testpass  |
    \`\`\`

    \`\`\`java
    package com.testleaf.stepdefs;

    import io.cucumber.java.en.*;
    import org.openqa.selenium.*;
    import org.openqa.selenium.chrome.ChromeDriver;
    import org.openqa.selenium.support.ui.ExpectedConditions;
    import org.openqa.selenium.support.ui.WebDriverWait;
    import java.time.Duration;
    import static org.junit.Assert.*;

    /**
     * Step definitions for Login feature.
     * Implements Selenium WebDriver setup and login workflow steps.
     */
    public class LoginStepDefinitions {
        private WebDriver driver;
        private WebDriverWait wait;

        /**
         * Setup WebDriver and WebDriverWait before each scenario.
         */
        @io.cucumber.java.Before
        public void setUp() {
            driver = new ChromeDriver();
            wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            driver.manage().window().maximize();
        }

        /**
         * Cleanup WebDriver after each scenario.
         */
        @io.cucumber.java.After
        public void tearDown() {
            if (driver != null) {
                driver.quit();
            }
        }

        /**
         * Navigate to the login page.
         */
        @Given("I open the login page")
        public void openLoginPage() {
            try {
                driver.get("\${pageUrl}");
                wait.until(ExpectedConditions.presenceOfElementLocated(By.id("email")));
            } catch (TimeoutException e) {
                fail("Login page failed to load: " + e.getMessage());
            }
        }

        /**
         * Enter username into the username field with explicit wait.
         */
        @When("I type {string} into the Username field")
        public void enterUsername(String username) {
            try {
                WebElement element = wait.until(
                    ExpectedConditions.elementToBeClickable(By.id("email"))
                );
                element.clear();
                element.sendKeys(username);
            } catch (TimeoutException e) {
                fail("Username field not clickable: " + e.getMessage());
            }
        }

        /**
         * Enter password into the password field with explicit wait.
         */
        @When("I type {string} into the Password field")
        public void enterPassword(String password) {
            try {
                WebElement element = wait.until(
                    ExpectedConditions.elementToBeClickable(By.id("password"))
                );
                element.clear();
                element.sendKeys(password);
            } catch (TimeoutException e) {
                fail("Password field not clickable: " + e.getMessage());
            }
        }

        /**
         * Click the login button with explicit wait for clickability.
         */
        @When("I click the Login button")
        public void clickLogin() {
            try {
                WebElement element = wait.until(
                    ExpectedConditions.elementToBeClickable(
                        By.xpath("//button[contains(text(), 'Login')]")
                    )
                );
                element.click();
            } catch (TimeoutException | NoSuchElementException e) {
                fail("Login button not found or clickable: " + e.getMessage());
            }
        }

        /**
         * Verify that login was successful by checking for success indicator.
         */
        @Then("I should be logged in successfully")
        public void verifyLogin() {
            try {
                WebElement successIndicator = wait.until(
                    ExpectedConditions.visibilityOfElementLocated(
                        By.className("success")
                    )
                );
                assertTrue("Success indicator not displayed", successIndicator.isDisplayed());
            } catch (TimeoutException e) {
                fail("Login verification failed: " + e.getMessage());
            }
        }
    }
    \`\`\`

    Persona:
    - Audience: Senior QA engineers building maintainable BDD automation with Selenium.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block + Java code in \`\`\`java\`\`\` block.

    Tone:
    - Professional, resilient, scalable, enterprise-ready.
  `,

  /**
   * Playwright TypeScript Page Object Prompt (No Test Class)
   */
  PLAYWRIGHT_TS_PAGE_ONLY: `
    Instructions:
    - Generate ONLY a Playwright TypeScript Page Object class for the provided website or page.
    - The output must be production-grade, reusable, and enterprise-ready for a mature QA automation framework.
    - Use robust Playwright locators, not brittle CSS selectors whenever possible.
    - Prefer getByRole, getByLabel, getByPlaceholder, getByText, getByTestId, and other semantic locators.
    - When selectors must use CSS/XPath, keep them stable and specific to the page structure.
    - Add JSDoc for the class and major methods.
    - Use meaningful method names that reflect user actions and page behavior.
    - Keep the class generic enough for reuse across flows, but specific enough for the actual DOM provided.
    - Include page-level locators, a constructor, page lifecycle helper methods, and action methods.
    - Do not include test cases or explanatory text.
    - Do not include comments like "TODO" or placeholder logic.
    - Use async/await consistently and return typed values when appropriate.
    - Add wait strategies for visibility, enabled state, and interaction readiness where needed.
    - Include error handling with try-catch for network failures and element not found scenarios.
    - Add retry logic or recovery methods where appropriate for flaky operations.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example structure to follow:
    \`\`\`ts
    import { Page, Locator } from '@playwright/test';

    export class LoginPage {
      readonly page: Page;
      readonly emailInput: Locator;
      readonly passwordInput: Locator;
      readonly loginButton: Locator;
      readonly errorMessage: Locator;

      constructor(page: Page) {
        this.page = page;
        this.emailInput = page.getByRole('textbox', { name: /email|mobile|phone/i }).or(page.locator('#email'));
        this.passwordInput = page.getByLabel(/password/i).or(page.locator('#password'));
        this.loginButton = page.getByRole('button', { name: /log in/i });
        this.errorMessage = page.locator('[role="alert"], .error-message, [data-testid="error"]');
      }

      async goto() {
        await this.page.goto('/');
      }

      async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
      }

      async expectPageLoaded() {
        await this.emailInput.waitFor({ state: 'visible' });
      }
    }
    \`\`\`

    Persona:
    - Audience: Senior QA automation engineers building maintainable and scalable Playwright frameworks.

    Output Format:
    - A single TypeScript class inside a \`\`\`ts\`\`\` block.

    Tone:
    - Professional, maintainable, enterprise-ready, scalable, resilient.
  `,

  /**
   * Playwright TypeScript Feature File Only Prompt
   */
  PLAYWRIGHT_TS_FEATURE_ONLY: `
    Instructions:
    - Generate ONLY a Cucumber (.feature) file.
    - Use Scenario Outline with Examples table.
    - Make sure every step is relevant to the provided DOM.
    - Do not combine multiple actions into one step.
    - Use South India realistic dataset (names, addresses, pin codes, mobile numbers).
    - Use dropdown values only from provided DOM.
    - Generate multiple scenarios if applicable.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "testuser" | "testpass"|
      | "admin"    | "admin123"|
    \`\`\`

    Persona:
    - Audience: BDD testers who only need feature files.

    Output Format:
    - Only valid Gherkin in a \`\`\`gherkin\`\`\` block.

    Tone:
    - Clear, structured, executable.
  `,

  /**
   * Playwright TypeScript Feature File with Step Definitions
   */
  PLAYWRIGHT_TS_FEATURE_AND_STEPS: `
    Instructions:
    - Generate BOTH:
      1. A Cucumber .feature file.
      2. A Playwright TypeScript step definition file.
    - Do NOT include Page Object code inside the step defs.
    - The step file must use a clean page object pattern where practical, keeping test logic readable and maintainable.
    - Step defs must include initialization, waits, and actual Playwright code.
    - Use Scenario Outline with Examples table (South India realistic data).
    - Keep selectors robust and reusable; prefer semantic locators.
    - Ensure the feature file and step definitions are framework-ready for a production QA suite.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`ts
    import { Given, When, Then } from '@cucumber/cucumber';
    import { expect, Page } from '@playwright/test';

    let page: Page;

    Given('I open the login page', async function () {
      page = this.page;
      await page.goto('\${pageUrl}');
      await page.getByRole('textbox', { name: /email|mobile|phone/i }).waitFor({ state: 'visible' });
    });

    When('I type {string} into the Username field', async function (username: string) {
      await page.getByRole('textbox', { name: /email|mobile|phone/i }).fill(username);
    });

    When('I type {string} into the Password field', async function (password: string) {
      await page.getByLabel(/password/i).fill(password);
    });

    When('I click the Login button', async function () {
      await page.getByRole('button', { name: /log in/i }).click();
    });

    Then('I should be logged in successfully', async function () {
      await expect(page.locator('[role="alert"], .success')).toBeVisible();
    });
    \`\`\`

    Persona:
    - Audience: Senior QA engineers building maintainable BDD automation with Playwright.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block + TypeScript code in \`\`\`ts\`\`\` block.

    Tone:
    - Professional, resilient, scalable, enterprise-ready.
  `,

  /**
   * Playwright JavaScript Page Object Prompt (No Test Class)
   */
  PLAYWRIGHT_JS_PAGE_ONLY: `
    Instructions:
    - Generate ONLY a Playwright JavaScript Page Object class for the provided website or page.
    - The output must be production-grade, reusable, and enterprise-ready for a mature QA automation framework.
    - Use robust Playwright locators, not brittle CSS selectors whenever possible.
    - Prefer getByRole, getByLabel, getByPlaceholder, getByText, getByTestId, and other semantic locators.
    - When selectors must use CSS/XPath, keep them stable and specific to the page structure.
    - Add JSDoc for the class and major methods.
    - Use meaningful method names that reflect user actions and page behavior.
    - Keep the class generic enough for reuse across flows, but specific enough for the actual DOM provided.
    - Include page-level locators, a constructor, page lifecycle helper methods, and action methods.
    - Do not include test cases or explanatory text.
    - Do not include comments like "TODO" or placeholder logic.
    - Use async/await consistently and return appropriate values when needed.
    - Add wait strategies for visibility, enabled state, and interaction readiness where needed.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example structure to follow:
    \`\`\`js
    const { expect } = require('@playwright/test');

    /**
     * Page Object for login page
     */
    class LoginPage {
      /**
       * @param {Page} page - Playwright Page instance
       */
      constructor(page) {
        this.page = page;
        this.emailInput = page.getByRole('textbox', { name: /email|mobile|phone/i }).or(page.locator('#email'));
        this.passwordInput = page.getByLabel(/password/i).or(page.locator('#password'));
        this.loginButton = page.getByRole('button', { name: /log in/i });
        this.errorMessage = page.locator('[role="alert"], .error-message, [data-testid="error"]');
      }

      /**
       * Navigate to the login page
       */
      async goto() {
        await this.page.goto('/');
      }

      /**
       * Perform login with credentials
       * @param {string} email - User email
       * @param {string} password - User password
       */
      async login(email, password) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
      }

      /**
       * Wait for page to fully load
       */
      async expectPageLoaded() {
        await this.emailInput.waitFor({ state: 'visible' });
      }
    }

    module.exports = { LoginPage };
    \`\`\`

    Persona:
    - Audience: Senior QA automation engineers building maintainable and scalable Playwright frameworks.

    Output Format:
    - A single JavaScript class inside a \`\`\`js\`\`\` block.

    Tone:
    - Professional, maintainable, enterprise-ready, scalable, resilient.
  `,

  /**
   * Playwright JavaScript Feature File Only Prompt
   */
  PLAYWRIGHT_JS_FEATURE_ONLY: `
    Instructions:
    - Generate ONLY a Cucumber (.feature) file.
    - Use Scenario Outline with Examples table.
    - Make sure every step is relevant to the provided DOM.
    - Do not combine multiple actions into one step.
    - Use South India realistic dataset (names, addresses, pin codes, mobile numbers).
    - Use dropdown values only from provided DOM.
    - Generate multiple scenarios if applicable.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "testuser" | "testpass"|
      | "admin"    | "admin123"|
    \`\`\`

    Persona:
    - Audience: BDD testers who only need feature files.

    Output Format:
    - Only valid Gherkin in a \`\`\`gherkin\`\`\` block.

    Tone:
    - Clear, structured, executable.
  `,

  /**
   * Playwright JavaScript Feature File with Step Definitions
   */
  PLAYWRIGHT_JS_FEATURE_AND_STEPS: `
    Instructions:
    - Generate BOTH:
      1. A Cucumber .feature file.
      2. A Playwright JavaScript step definition file.
    - Do NOT include Page Object code inside the step defs.
    - The step file must use a clean page object pattern where practical, keeping test logic readable and maintainable.
    - Step defs must include initialization, waits, and actual Playwright code.
    - Use Scenario Outline with Examples table (South India realistic data).
    - Keep selectors robust and reusable; prefer semantic locators.
    - Ensure the feature file and step definitions are framework-ready for a production QA suite.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`js
    const { Given, When, Then } = require('@cucumber/cucumber');
    const { expect } = require('@playwright/test');

    let page;

    Given('I open the login page', async function () {
      page = this.page;
      await page.goto('\${pageUrl}');
      await page.getByRole('textbox', { name: /email|mobile|phone/i }).waitFor({ state: 'visible' });
    });

    When('I type {string} into the Username field', async function (username) {
      await page.getByRole('textbox', { name: /email|mobile|phone/i }).fill(username);
    });

    When('I type {string} into the Password field', async function (password) {
      await page.getByLabel(/password/i).fill(password);
    });

    When('I click the Login button', async function () {
      await page.getByRole('button', { name: /log in/i }).click();
    });

    Then('I should be logged in successfully', async function () {
      await expect(page.locator('[role="alert"], .success')).toBeVisible();
    });
    \`\`\`

    Persona:
    - Audience: Senior QA engineers building maintainable BDD automation with Playwright.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block + JavaScript code in \`\`\`js\`\`\` block.

    Tone:
    - Professional, resilient, scalable, enterprise-ready.
  `
}

/**
 * Helper function to escape code blocks in prompts
 */
function escapeCodeBlocks(text) {
  return text.replace(/```/g, '\\`\\`\\`');
}

/**
 * Function to fill template variables in a prompt
 */
export function getPrompt(promptKey, variables = {}) {
  let prompt = DEFAULT_PROMPTS[promptKey];
  if (!prompt) {
    throw new Error(`Prompt not found: ${promptKey}`);
  }

  Object.entries(variables).forEach(([k, v]) => {
    const regex = new RegExp(`\\$\\{${k}\\}`, 'g');
    prompt = prompt.replace(regex, v);
  });

  return prompt.trim();
}

export const CODE_GENERATOR_TYPES = {
  SELENIUM_JAVA_PAGE_ONLY: 'Selenium-Java-Page-Only',
  CUCUMBER_ONLY: 'Cucumber-Only',
  CUCUMBER_WITH_SELENIUM_JAVA_STEPS: 'Cucumber-With-Selenium-Java-Steps',
  PLAYWRIGHT_TS_PAGE_ONLY: 'Playwright-TS-Page-Only',
  PLAYWRIGHT_TS_FEATURE_ONLY: 'Playwright-TS-Feature-Only',
  PLAYWRIGHT_TS_FEATURE_AND_STEPS: 'Playwright-TS-Feature-And-Steps',
  PLAYWRIGHT_JS_PAGE_ONLY: 'Playwright-JS-Page-Only',
  PLAYWRIGHT_JS_FEATURE_ONLY: 'Playwright-JS-Feature-Only',
  PLAYWRIGHT_JS_FEATURE_AND_STEPS: 'Playwright-JS-Feature-And-Steps',
};
