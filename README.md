# Invenease Server

A robust inventory management system backend built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- User authentication and authorization
- Inventory management
- Order processing
- Warehouse management
- Supplier management
- Real-time notifications
- Activity logging
- Multi-warehouse support

## Tech Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Socket.IO
- JWT Authentication
- Winston Logger

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- pnpm (v10.11.0 or higher)

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd invenease-server
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration.

4. Set up the database:
```bash
pnpm prisma migrate dev
```

5. Start the development server:
```bash
pnpm dev
```

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build the project
- `pnpm start` - Start production server
- `pnpm prisma:studio` - Open Prisma Studio
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run database migrations

## Project Structure

```
src/
├── common/         # Shared utilities and middleware
├── generated/      # Generated Prisma client
├── modules/        # Feature modules
├── app.ts         # Express app configuration
├── index.ts       # Application entry point
└── socket.ts      # Socket.IO configuration
```

## API Documentation

API documentation is available at `/api-docs` when running the server.

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

ISC
