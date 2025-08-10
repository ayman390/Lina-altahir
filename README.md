# Luggage Share

A peer-to-peer luggage delivery platform that connects travelers with extra luggage space to people who need to send items.

## Features

- **Overview Dashboard**: Track bookings, shipments, and earnings
- **Search & Book**: Find available luggage space with pricing calculator
- **Need Space**: Submit requests for luggage delivery with KYC verification
- **Have Space**: List available luggage capacity with flight ticket verification
- **Order Management**: Track orders with escrow payment system
- **Shipment Tracking**: Monitor delivery status
- **Secure Payments**: Card and bank account management
- **Support System**: Ticket-based customer support
- **End-to-End Encryption**: Secure chat functionality
- **Multi-Currency Support**: 100+ currencies supported
- **Regional Pricing**: Dynamic pricing based on route regions

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Charts**: Recharts
- **Routing**: React Router DOM
- **Encryption**: Web Crypto API

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd luggage-share
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your Supabase project:
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy the SQL schema from the `/sql` page in the app
   - Update `.env.local` with your Supabase credentials

5. Start the development server:
```bash
pnpm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OWNER_EMAIL=your_admin_email@example.com
VITE_UPLOADS_BUCKET=uploads
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Build

```bash
pnpm run build
pnpm run preview
```

## Database Schema

The app includes a complete SQL schema for Supabase. Visit the `/sql` page in the application to copy the schema and set up your database tables.

## Security Features

- KYC verification with document uploads
- End-to-end encrypted messaging
- Escrow payment system
- Owner-only financial visibility
- Secure file storage

## Regional Pricing

The platform supports dynamic pricing based on regional routes:
- UAE, GCC, Middle East, Africa, Indian Subcontinent, Southeast Asia, Europe/CIS
- Prices displayed to users are 80% of base rates
- Platform takes 40% commission (visible to owner only)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, visit the Support page in the application or contact the development team.

