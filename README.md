# AI Email Classifier based on System One AI Models

A Proof of Concept (POC) web application that connects to your Gmail account to intelligently fetch, analyze, and classify your emails in real-time. 

This project demonstrates how to handle continuous background synchronization of your Emails while concurrently processing that data through a [System One AI Model](https://docs.typesafe.ai/concepts/system-one) (e.g., [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)) to categorize emails by urgency, intent, and actionable context.

## 🚀 Features

- **Gmail Integration:** Secure authentication via NextAuth.js to securely fetch emails from your inbox.
- **Continuous Background Sync:** Fetches emails seamlessly in the background. It implements intelligent rate-limiting and quota handling—automatically pausing and resuming fetches when Gmail API limits are reached.
- **Real-time LLM Classification:** Streams data from emails into an System One AI Model that determines the email's category (e.g., Important, Newsletter, Spam) and urgency level.
- **Dynamic Dashboard:** A comprehensive UI built with shadcn/ui and TailwindCSS that allows filtering, sorting, and viewing metrics (time taken, cost of classification) in real-time as background tasks run.
- **Resilient Workers:** The background analysis worker dynamically processes emails as they arrive without dropping state, ensuring every email is analyzed even if synchronization is throttled.
- **Data Persistency:** Uses Prisma ORM with SQLite to securely persist fetched emails and their AI classifications, preventing redundant API calls and repetitive LLM costs.
- **Mock Data Support:** Includes built-in mock modes (`RUN_IN_MOCK_EMAIL=true` and `RUN_IN_MOCK_MODEL=true`) and a database seeder for offline development and UI testing without hitting live Gmail or LLM APIs.

## 💼 Practical Use Cases

For Small to Medium-sized Businesses (SMBs), an overflowing inbox can be a goldmine of untapped opportunities or unwanted noise. This application can serve as a foundation for various vital business operations:

### Lead Generation & CRM Integration
- **Automated Lead Discovery:** By tweaking the classification criterias, the AI can be instructed to specifically identify "Potential Leads" or "Sales Inquiries" from incoming emails, separating high-value prospects from general noise.
- **Sentiment & Intent Analysis:** The AI model can analyze the tone of the email to gauge a potential customer's purchase intent or urgency, allowing sales teams to prioritize follow-ups on "hot" leads.
- **CRM Integration:** With slight modifications, this system can be integrated directly into a CRM platform. Once a lead is identified, the backend could automatically create a new contact profile, log the communication history, and assign a task to a sales representative.

### Customer Support & Helpdesk Triage
- **Automated Routing:** Instead of leads, the AI can categorize incoming customer emails by issue type (e.g., Billing, Technical Support, Feature Request, Complaints).
- **Urgency Escalation:** It can instantly flag angry or highly frustrated customers (sentiment analysis) or critical issues (e.g., "server down"), bumping them to the top of the queue or sending an instant Slack alert to a manager.

### HR & Applicant Tracking
- **Resume Sorting:** For companies with a generic careers@ inbox, the AI can instantly separate job applications from vendor pitches or spam.
- **Candidate Triage:** It could even be prompted to categorize applicants by the role they are applying for based on the email body, saving recruiters hours of manual sorting.

## ⚡ Why System One Models?

For massive classification tasks like scanning thousands of emails, utilizing a reasoning model can become prohibitively slow and expensive. This project leverages a **System One AI Model** (such as Jev) because:

- **Lightning Fast:** System One models do not waste time generating a large number of conversational output tokens or internal "chain of thought" reasoning tokens. They output structured, precise classifications almost instantly.
- **Cost-Effective:** Because they generate very few output tokens—and in the case of the Jev model, API calls are only charged for input tokens (output tokens are entirely free)—they are remarkably cheap to run at scale, even for overloaded inboxes.

## 🛠️ Technologies Used

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Google API:** `googleapis` (Gmail v1 API)
- **Database:** Prisma ORM (with SQLite)
- **Language:** TypeScript
- **Package Manager:** pnpm

## ⚙️ Setup and Running the Project

### Prerequisites

1. **Node.js** (v20+ recommended)
2. **pnpm** installed (`npm install -g pnpm`)
3. A **Google Cloud Project** with the Gmail API enabled and OAuth credentials configured.
4. An **OpenRouter API Key** for the `/api/classify` route to classify emails.

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-email-classifier
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the necessary environment variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenRouter API Key for LLM Classification
OPENROUTER_API_KEY=your_api_key

# Mock Modes
# Set to true to use local seeded mock data instead of the real Gmail API
RUN_IN_MOCK_EMAIL=true


DISM /Online /Cleanup-Image /AnalyzeComponentStore# Set to true to use a mock model instead of calling the actual AI Model Provider API
RUN_IN_MOCK_MODEL=true
```

### 4. Database Setup

Initialize the local SQLite database and populate it with the mock data seeder:

```bash
pnpm exec prisma db push
pnpm exec prisma db seed
```

### 5. Run the Development Server

Start the application in development mode:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. Log in with your Google account to start syncing and analyzing your inbox!

## 📄 License

This project is open-source and available under the MIT License.

## 📚 References

- [System One AI Models - Typesafe Docs](https://docs.typesafe.ai/concepts/system-one)
- [Introducing System One Models and Jev - Typesafe Blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
