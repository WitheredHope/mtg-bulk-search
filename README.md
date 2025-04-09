# React Supabase Authentication

A simple React application demonstrating email and password authentication using Supabase.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Supabase project:
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Create a new project
   - Enable Authentication
   - Enable Email/Password authentication in the Authentication settings

4. Configure environment variables:
   - Copy `.env` to `.env.local`
   - Update the values with your Supabase configuration:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

5. Start the development server:
   ```bash
   npm run dev
   ```

## Features

- Email and Password Authentication
- Protected Routes
- Modern UI Design
- TypeScript Support
- Form Validation
- Error Handling

## Technologies Used

- React
- TypeScript
- Supabase
- React Router
- CSS Modules
