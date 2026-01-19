# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a detailed Product Requirements Document (PRD) in Markdown format, based on an initial user prompt. The PRD should be clear, actionable, and suitable for a junior developer to understand and implement a new product from the ground up.

## Process

1. **Receive Initial Prompt:** The user provides a brief description or vision for a new product they want to build.
2. **Ask Clarifying Questions:** Before writing the PRD, the AI *must* ask only the most essential clarifying questions needed to write a clear PRD. Limit questions to 5-7 critical gaps in understanding. The goal is to understand the "what" and "why" of the product, target users, platform choices, MVP scope, and business model. Make sure to provide options in letter/number lists so I can respond easily with my selections.
3. **Generate PRD:** Based on the initial prompt and the user's answers to the clarifying questions, generate a comprehensive PRD using the structure outlined below.
4. **Save PRD:** Save the generated document as `prd-[product-name].md` inside the `/tasks` directory.

## Clarifying Questions (Guidelines)

Ask only the most critical questions needed to write a clear PRD. Focus on areas where the initial prompt is ambiguous or missing essential context. Common areas that may need clarification:

* **Problem/Goal:** If unclear - "What problem does this product solve for users? What is the core value proposition?"
* **Target Users:** If vague - "Who is the primary target audience? What are their characteristics and needs?"
* **Platform/Deployment:** If unspecified - "What platform(s) will this product run on? (Web, mobile, desktop, etc.)"
* **MVP Scope:** If broad - "What is the minimum viable product (MVP)? What features are essential for the first version?"
* **Business Model:** If unstated - "How will this product generate value? (Free, paid, subscription, etc.)"
* **Success Criteria:** If unstated - "How will we know when this product is successfully launched?"

**Important:** Only ask questions when the answer isn't reasonably inferable from the initial prompt. Prioritize questions that would significantly impact the PRD's clarity and the product's foundational decisions.

### Formatting Requirements

* **Number all questions** (1, 2, 3, etc.)
* **List options for each question as A, B, C, D, etc.** for easy reference
* Make it simple for the user to respond with selections like "1A, 2C, 3B"

### Example Format

```
1. What is the primary problem this product solves?
   A. Streamline workflow for remote teams
   B. Help individuals manage personal finances
   C. Connect buyers and sellers in a marketplace
   D. Provide educational content and resources

2. Who is the primary target user?
   A. Small business owners
   B. Students and educators
   C. Tech-savvy professionals
   D. General consumers

3. What platform(s) should this product be built for?
   A. Web application only
   B. Mobile app (iOS/Android)
   C. Desktop application
   D. Multi-platform (web + mobile)

4. What is the MVP scope for the first version?
   A. Core functionality only, minimal features
   B. Full feature set from the start
   C. Core features + one advanced feature
   D. Focus on one specific use case

5. What is the business model?
   A. Free to use
   B. One-time purchase
   C. Subscription-based
   D. Freemium model
```

## PRD Structure

The generated PRD should include the following sections:

1. **Introduction/Overview:** Briefly describe the product, the problem it solves, and the target market. State the product vision and core value proposition.
2. **Product Goals:** List the specific, measurable objectives for this product. What are the primary goals for the MVP and beyond?
3. **Target Users:** Define the primary and secondary user personas. Include their characteristics, needs, pain points, and how the product addresses them.
4. **Platform & Deployment:** Specify the platform(s) the product will be built for (web, mobile, desktop, etc.) and deployment considerations.
5. **MVP Scope:** Clearly define what is included in the Minimum Viable Product (MVP) - the core features needed for the first release.
6. **User Stories:** Detail the user narratives describing product usage and benefits. Focus on MVP user stories first.
7. **Functional Requirements:** List the specific functionalities the product must have. Use clear, concise language (e.g., "The system must allow users to create an account."). Number these requirements and organize by priority (MVP vs. future).
8. **Non-Goals (Out of Scope):** Clearly state what this product will *not* include in the MVP (and potentially future versions) to manage scope.
9. **Technical Considerations:** Mention technical stack preferences, constraints, dependencies, third-party services needed, infrastructure requirements, and scalability considerations.
10. **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, design system preferences, or mention relevant components/styles if applicable.
11. **Business Model:** Describe how the product will generate value (pricing model, revenue streams, if applicable).
12. **Success Metrics:** How will the success of this product be measured? (e.g., "Achieve 1,000 active users in first month", "Maintain 80% user satisfaction score").
13. **Launch Strategy (Optional):** Brief overview of how the product will be launched and made available to users.
14. **Open Questions:** List any remaining questions or areas needing further clarification.

## Target Audience

Assume the primary reader of the PRD is a **junior developer** who will be building the product from scratch. Therefore, requirements should be explicit, unambiguous, and avoid jargon where possible. Provide enough detail for them to understand the product's purpose, core logic, and technical decisions needed to get started.

## Output

* **Format:** Markdown (`.md`)
* **Location:** `/tasks/`
* **Filename:** `prd-[product-name].md`

## Final instructions

1. Do NOT start implementing the product or writing code
2. Make sure to ask the user clarifying questions about the product vision, target users, platform, MVP scope, and business model
3. Take the user's answers to the clarifying questions and incorporate them into the PRD
4. Focus on creating a comprehensive product blueprint that a developer can use to build from scratch
