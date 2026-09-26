import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.classificationModel.upsert({
    where: { model_id: 'jev-latest' },
    update: {},
    create: { model_id: 'jev-latest', name: 'JEV' },
  });
  console.log('Seeded JEV model');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
