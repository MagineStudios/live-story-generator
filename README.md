# 📚 Live Story Generator

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.3.2-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind-4.1.6-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Prisma-6.7.0-2D3748?style=for-the-badge&logo=prisma" alt="Prisma"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Latest-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL"/>
</div>

## 🌟 Overview

Live Story Generator is an AI-powered web application that creates personalized, illustrated stories for children and families. Users can upload photos of their loved ones, pets, and favorite places, then watch as the AI weaves them into magical stories with beautiful illustrations.

### ✨ Key Features

- **🎭 Personalized Characters**: Upload photos of family members, pets, or favorite objects to include them in your stories
- **🎨 Multiple Visual Styles**: Choose from various artistic styles for your story illustrations
- **🤖 AI-Powered Content**: OpenAI generates engaging stories tailored to your chosen theme and characters
- **📖 Interactive Story Builder**: 5-step wizard interface for easy story creation
- **🖼️ Smart Image Generation**: AI-generated illustrations that match your story content
- **📄 PDF Export**: Download your completed story as a beautifully formatted PDF
- **🎵 Optional Music**: Add background music to enhance the storytelling experience
- **🌍 My World Library**: Save and reuse your characters, pets, locations, and objects across multiple stories
- **💳 Credit System**: Flexible credit-based pricing for story generation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- Accounts and API keys for:
  - [Clerk](https://clerk.com) (Authentication)
  - [OpenAI](https://openai.com) (Story & image generation)
  - [Cloudinary](https://cloudinary.com) (Image storage)
  - [Stripe](https://stripe.com) (Payments)
  - [Inngest](https://inngest.com) (Background jobs)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MagineStudios/live-story-generator.git
   cd live-story-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/story_generator"
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
   CLERK_SECRET_KEY="sk_..."
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
   
   # OpenAI
   OPENAI_API_KEY="sk-..."
   
   # Cloudinary
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="..."
   CLOUDINARY_API_SECRET="..."
   
   # Stripe
   STRIPE_SECRET_KEY="sk_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   
   # Inngest
   INNGEST_EVENT_KEY="..."
   INNGEST_SIGNING_KEY="..."
   
   # App URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate deploy
   
   # (Optional) Seed visual styles
   npm run seed-styles
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Project Structure

```
live-story-generator/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── images/       # Image generation & processing
│   │   │   ├── story/        # Story creation & management
│   │   │   ├── my-world/     # Character/element management
│   │   │   └── onboarding/   # User onboarding flow
│   │   ├── onboarding/       # Onboarding UI pages
│   │   ├── story/            # Story viewing & editing pages
│   │   └── page.tsx          # Home page with wizard
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn UI components
│   │   └── wizard/           # Story creation wizard steps
│   ├── lib/                   # Utilities and helpers
│   │   ├── context/          # React contexts
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Utility functions
│   └── scripts/              # Database scripts
├── prisma/
│   └── schema.prisma         # Database schema
├── public/                    # Static assets
└── package.json              # Dependencies
```

## 🎯 User Journey

### 1. **Story Setup** 🎭
   - Users can upload or select characters, pets, locations, and objects
   - AI analyzes uploaded images to extract details and descriptions
   - Elements are saved to "My World" for reuse in future stories

### 2. **Style Selection** 🎨
   - Choose from pre-designed visual styles (e.g., watercolor, cartoon, realistic)
   - Each style has its own prompt template for consistent illustrations

### 3. **Theme & Prompt** 📝
   - Select a story theme or enter a custom prompt
   - AI suggests age-appropriate themes based on selected characters

### 4. **Story Generation** 🤖
   - AI creates a multi-page story incorporating selected elements
   - Each page gets custom illustrations matching the chosen style
   - Real-time progress updates during generation

### 5. **Review & Edit** ✏️
   - Preview the complete story with illustrations
   - Edit text or regenerate specific images
   - Export as PDF or add optional background music

## 🔧 Key Technologies

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first styling
- **Shadcn/ui**: Modern React component library
- **Framer Motion**: Smooth animations
- **React Hook Form**: Form handling

### Backend
- **Prisma**: Type-safe database ORM
- **PostgreSQL**: Relational database
- **Inngest**: Serverless background jobs
- **Zod**: Schema validation

### AI & Media
- **OpenAI GPT-4**: Story generation
- **DALL-E 3**: Image generation
- **Cloudinary**: Image storage and transformation
- **PDFKit**: PDF generation

### Infrastructure
- **Clerk**: Authentication and user management
- **Stripe**: Payment processing
- **Vercel**: Deployment platform

## 📊 Database Schema

The application uses a comprehensive database schema to manage:

- **Users & Authentication**: Linked with Clerk
- **Stories**: Multi-page stories with metadata
- **My World Elements**: Reusable characters, pets, locations, and objects
- **Images**: Multiple variants per story page
- **Visual Styles**: Predefined artistic styles
- **Credits**: Usage tracking and billing
- **Background Jobs**: Video and music generation tasks

See `prisma/schema.prisma` for the complete schema.

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Fork this repository**

2. **Import to Vercel**
   - Go to [vercel.com/import](https://vercel.com/import)
   - Select your forked repository
   - Configure environment variables

3. **Database Setup**
   - Use Vercel Postgres or connect external PostgreSQL
   - Run migrations via Vercel CLI or deployment hook

4. **Post-Deployment**
   - Configure Stripe webhooks
   - Set up Cloudinary upload presets
   - Test the complete flow

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔒 Security Considerations

- All API routes are protected with Clerk authentication
- File uploads are validated and sanitized
- Database queries use parameterized statements via Prisma
- Environment variables are properly scoped (client vs server)
- CORS is configured for production domains

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vercel](https://vercel.com) for hosting and Next.js
- [Shadcn](https://ui.shadcn.com) for the beautiful UI components
- [OpenAI](https://openai.com) for GPT and DALL-E APIs
- All our contributors and users!

## 📧 Support

For support, email support@livebookco.com or join our [Discord community](https://discord.gg/livebook).

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/MagineStudios">Magine Studios</a>
</div>
