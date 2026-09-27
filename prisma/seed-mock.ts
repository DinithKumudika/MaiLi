import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const senders = [
  "newsletter@example.com",
  "boss@company.com",
  "support@amazon.com",
  "friend@personal.com",
  "alert@github.com",
  "marketing@store.com",
  "hr@company.com",
  "billing@stripe.com",
];

const subjects = [
  "Your Weekly Digest",
  "URGENT: Project Deadline Update",
  "Your Order #12345 has shipped",
  "Lunch tomorrow?",
  "[GitHub] New vulnerability alert",
  "50% OFF All Items! Weekend Sale",
  "Please review your benefits enrollment",
  "Invoice #INV-2023 for your subscription",
];

const bodies = [
  "Here is what happened this week in the tech world. Lots of interesting updates regarding AI and web development.",
  "Please ensure the presentation is ready by 2 PM today. The client is expecting a full walkthrough.",
  "Great news! Your package is on its way. Track your shipment here.",
  "Hey, are we still on for lunch tomorrow at 12:30? Let me know.",
  "We found a potential security vulnerability in your repository. Please review the dependabot PR.",
  "Don't miss out on our biggest sale of the year. Click here to claim your 50% discount on all items in store.",
  "This is a reminder that the open enrollment period ends this Friday. Please submit your forms.",
  "Attached is your invoice for the upcoming month. Your card will be charged automatically on the 1st.",
];

async function main() {
  console.log("Seeding 200 mock emails...");
  
  // Clear existing to avoid duplicates if run multiple times
  await prisma.mockEmail.deleteMany();

  const mockEmails = [];
  
  for (let i = 0; i < 200; i++) {
    // Pick random data or cycle through to ensure some variety
    const index = i % senders.length;
    // Add some random variation
    const randomVariation = Math.floor(Math.random() * senders.length);
    
    mockEmails.push({
      id: `mock-email-${i}`,
      from: senders[randomVariation],
      to: "me@example.com",
      subject: subjects[index] + (i > 7 ? ` (Copy ${i})` : ""),
      date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
      snippet: bodies[index].substring(0, 50) + "...",
      body: bodies[index],
    });
  }

  await prisma.mockEmail.createMany({
    data: mockEmails,
  });

  console.log(`Successfully seeded ${mockEmails.length} mock emails!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
