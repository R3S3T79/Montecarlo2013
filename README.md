@@ .. @@
 # Montecarlo2013 - Statistical Simulation Platform
 
 Advanced Monte Carlo simulation platform for statistical analysis and risk assessment.
+
+## Authentication System
+
+This application includes a complete user authentication and admin approval system:
+
+### Features
+- User registration with email confirmation
+- Admin approval workflow
+- Role-based access (user, creator, admin)
+- Email notifications via SendGrid
+
+### Setup
+
+1. **Environment Variables**: Copy `.env.example` to `.env` and configure:
+   ```bash
+   cp .env.example .env
+   ```
+
+2. **Supabase Setup**: Ensure your Supabase project has the required RPC functions:
+   - `create_pending_user(email, username, password)`
+   - `confirm_pending_user(token)`
+   - `list_pending_users()`
+   - `approve_user(user_id, role)`
+
+3. **SendGrid Setup**: Configure SendGrid API key for email notifications
+
+### User Flow
+1. User registers at `/register`
+2. Confirmation email sent with token
+3. User clicks confirmation link (`/confirm?token=...`)
+4. Admin receives notification email
+5. Admin approves user via `/admin-panel`
+6. User receives welcome email and can login
+
+### Admin Panel
+Access the admin panel at `/admin-panel` to:
+- View pending user registrations
+- Approve/reject users
+- Assign roles (user, creator, admin)
+
+## Development
+
+```bash
+npm run dev          # Start development server
+npm run build        # Build for production
+npm run netlify:dev  # Test with Netlify Functions locally
+```# Montecarlo2013
# Test deploy Sat Jul 12 12:08:17     2025
