# Booking System

Full-stack booking system with role-based authentication, slot management, and bookings.

---

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Frontend:** Next.js, React 18
- **UI:** Ant Design + Tailwind CSS
- **Authentication:** JWT (access & refresh tokens)
- **Documentation:** Swagger for API

---

## Project Structure

### Backend (`/backend`)

- Express server with modular routes
- Controllers for handling business logic
- Models: User, Slot, Booking
- Middleware: Authentication, Error Handling
- Swagger docs available at `/api-docs`

### Frontend (`/frontend`)

- Next.js SPA with pages for auth, admin, and user dashboards
- Reusable components for forms, tables, modals
- Utilities: API calls (axios), helper functions
- Styling with Tailwind CSS + Ant Design

### Environment Variables

---

## Features

- **Authentication & User Management**

  - JWT-based login & registration
  - Roles: Admin (full access), User (personal bookings)
  - Protected routes on backend and frontend

- **Booking System**

  - Users can create, view, update, and delete bookings
  - Admin can view all bookings with filters (user, date, status)
  - Prevents double-booking for the same slot

- **Slot Management (Admin)**

  - Create, edit, delete slots
  - Slots have date, time, and status (available, booked, expired)

- **Frontend Enhancements**
  - Debounced search and filter
  - Inline table actions (edit/delete)
  - Popconfirm for destructive actions
  - Notifications and loading indicators

---

## Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/Lyxing9999/booking-system.git
cd booking-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

---
## Backend Environment Variables (.env)

  - PORT=5000
  - MONGO_URI=mongodb://127.0.0.1:27017/booking-system

  - JWT_SECRET=YOUR_JWT_SECRET
  - JWT_REFRESH_SECRET=YOUR_JWT_REFRESH_SECRET

  - MAIL_HOST=smtp.example.com
  - MAIL_PORT=587
  - MAIL_USER=your_user
  - MAIL_PASS=your_pass


---
## Run Backend

```bash
npm run dev
```

## Backend Server runs at http://localhost:5000

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

## Frontend Environment Variables (.env.local)

  - NEXT_PUBLIC_API_URL=http://localhost:5000
  - JWT_SECRET=your_jwt_secret
  - JWT_REFRESH_SECRET=your_jwt_refresh_secretlet

---
## Run Frontend

```bash
npm run dev
```

## Frontend App runs at http://localhost:3000

## API Endpoints (Overview)

### Auth

| Method | Endpoint       | Description                              |
| ------ | -------------- | ---------------------------------------- |
| POST   | /auth/register | Register user                            |
| POST   | /auth/login    | Login user                               |
| POST   | /auth/refresh  | Refresh access token using refresh token |
| POST   | /auth/logout   | Logout user (clear cookies)              |
| GET    | /auth/me       | Get current user                         |

### Users (Admin)

| Method | Endpoint             | Description                                              |
| ------ | -------------------- | -------------------------------------------------------- |
| GET    | /api/admin/users     | Get all non-admin users with booking counts (admin only) |
| POST   | /api/admin/users     | Create a new user (admin only)                           |
| PUT    | /api/admin/users/:id | Update any user (admin only)                             |
| DELETE | /api/admin/users/:id | Delete a user (admin only)                               |
| GET    | /api/user/profile    | Get logged-in user's profile                             |
| PATCH  | /api/user/profile    | Update logged-in user's profile (name, email, password)  |

### Bookings

| Method | Endpoint                        | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| GET    | /api/bookings/user              | Get current user's bookings        |
| POST   | /api/bookings                   | Create a new booking (User only)   |
| PATCH  | /api/bookings/user/{bookingId}  | Update current user's booking      |
| DELETE | /api/bookings/user/{id}         | Delete current user's booking      |
| GET    | /api/bookings/admin             | Get all bookings (Admin)           |
| PATCH  | /api/bookings/admin/{id}/status | Update booking status (Admin only) |
| GET    | /api/bookings/admin/confirmed   | Get all confirmed bookings (Admin) |

### Slots (Admin)

| Method | Endpoint                  | Description                                             |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | /api/slots                | Get all slots (Admin/User)                              |
| POST   | /api/slots                | Create a new slot (Admin only)                          |
| GET    | /api/slots/user           | Get available & booked slots for user UX                |
| GET    | /api/slots/user/available | Get only available slots for user                       |
| GET    | /api/slots/admin          | Get all slots with admin view (availability + bookings) |
| PUT    | /api/slots/:id            | Update a slot (Admin only)                              |
| DELETE | /api/slots/:id            | Delete a slot (Admin only)                              |

---
