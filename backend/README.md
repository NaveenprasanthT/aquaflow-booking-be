# AquaFlow Booking Backend API

Complete backend API for the AquaFlow car wash booking system built with Express.js, MongoDB, and Node.js.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Employee, Customer)
  - Secure password hashing with bcrypt

- **User Management**
  - User registration and login
  - Profile management
  - Three user roles: Admin, Employee, Customer

- **Booking System**
  - Create bookings (guest or authenticated)
  - View all bookings (admin)
  - View my bookings (customer/employee)
  - Update booking status
  - Assign employees to bookings
  - Price calculation

- **Employee Management**
  - Employee dashboard with stats
  - Update employee status (available/busy/offline)
  - Track completed jobs

- **Admin Dashboard**
  - Comprehensive statistics
  - Manage employees
  - View all customers
  - Manage contact form submissions

- **Services**
  - Get available services and pricing
  - Calculate booking price

- **Contact Form**
  - Submit contact inquiries
  - Admin can view and manage contacts

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 🛠️ Installation

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   Edit `.env` file with your configurations:

   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/aquaflow-booking
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start MongoDB:**
   Make sure MongoDB is running on your system.

   ```bash
   # For Windows (if MongoDB is installed as a service)
   net start MongoDB

   # For Mac/Linux
   sudo systemctl start mongod
   # or
   brew services start mongodb-community
   ```

6. **Seed the database (optional):**

   ```bash
   npm run seed
   ```

   This will create test accounts:
   - **Admin:** Phone: `1234567890`, Password: `admin123`
   - **Employees:** Phone: `987654321X`, Password: `employee123`
   - **Customers:** Phone: `555123456X`, Password: `customer123`

7. **Start the server:**

   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

The server will run on `http://localhost:5000`

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint    | Access  | Description         |
| ------ | ----------- | ------- | ------------------- |
| POST   | `/register` | Public  | Register new user   |
| POST   | `/login`    | Public  | Login user          |
| GET    | `/me`       | Private | Get current user    |
| PUT    | `/profile`  | Private | Update user profile |

### Booking Routes (`/api/bookings`)

| Method | Endpoint      | Access         | Description           |
| ------ | ------------- | -------------- | --------------------- |
| POST   | `/`           | Public         | Create booking        |
| GET    | `/`           | Admin          | Get all bookings      |
| GET    | `/my`         | Private        | Get my bookings       |
| GET    | `/:id`        | Private        | Get single booking    |
| PUT    | `/:id/status` | Employee/Admin | Update booking status |
| PUT    | `/:id/assign` | Admin          | Assign employee       |
| DELETE | `/:id`        | Admin          | Delete booking        |

### Employee Routes (`/api/employees`)

| Method | Endpoint           | Access         | Description            |
| ------ | ------------------ | -------------- | ---------------------- |
| GET    | `/`                | Admin          | Get all employees      |
| GET    | `/dashboard/stats` | Employee       | Get employee stats     |
| GET    | `/:id`             | Admin          | Get single employee    |
| PUT    | `/:id/status`      | Employee/Admin | Update employee status |

### Admin Routes (`/api/admin`)

| Method | Endpoint               | Access | Description           |
| ------ | ---------------------- | ------ | --------------------- |
| GET    | `/stats`               | Admin  | Get dashboard stats   |
| POST   | `/employees`           | Admin  | Create employee       |
| DELETE | `/employees/:id`       | Admin  | Delete employee       |
| GET    | `/customers`           | Admin  | Get all customers     |
| GET    | `/contacts`            | Admin  | Get all contacts      |
| PUT    | `/contacts/:id/status` | Admin  | Update contact status |

### Contact Routes (`/api/contact`)

| Method | Endpoint | Access | Description         |
| ------ | -------- | ------ | ------------------- |
| POST   | `/`      | Public | Submit contact form |
| GET    | `/`      | Admin  | Get all contacts    |
| GET    | `/:id`   | Admin  | Get single contact  |
| DELETE | `/:id`   | Admin  | Delete contact      |

### Service Routes (`/api/services`)

| Method | Endpoint           | Access | Description             |
| ------ | ------------------ | ------ | ----------------------- |
| GET    | `/`                | Public | Get all services        |
| POST   | `/calculate-price` | Public | Calculate booking price |

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Example Authentication Flow

1. **Register:**

   ```bash
   POST /api/auth/register
   {
     "phone": "9876543210",
     "password": "password123",
     "confirmPassword": "password123",
     "name": "John Doe"
   }
   ```

2. **Login:**

   ```bash
   POST /api/auth/login
   {
     "phone": "9876543210",
     "password": "password123"
   }
   ```

3. **Response:**

   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": {
         "id": "...",
         "phone": "9876543210",
         "name": "John Doe",
         "role": "customer"
       }
     }
   }
   ```

4. **Use token in subsequent requests:**
   ```bash
   GET /api/auth/me
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 📦 Data Models

### User Model

```javascript
{
  phone: String (unique, required),
  password: String (required, hashed),
  name: String,
  role: String (customer/employee/admin),
  avatar: String,
  status: String (available/busy/offline),
  completedJobs: Number,
  createdAt: Date
}
```

### Booking Model

```javascript
{
  bookingId: String (auto-generated),
  customerId: ObjectId (ref: User),
  serviceType: String (required),
  addOns: [String],
  address: String (required),
  date: String (required),
  timeSlot: String (required),
  name: String (required),
  phone: String (required),
  notes: String,
  status: String (new/assigned/in-progress/completed),
  totalPrice: Number (required),
  assignedEmployee: ObjectId (ref: User),
  createdAt: Date
}
```

### Contact Model

```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required),
  phone: String,
  message: String (required),
  status: String (new/read/replied),
  createdAt: Date
}
```

## 🧪 Testing the API

### Using cURL

**Create a booking:**

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "car-5-seater",
    "addOns": ["foam-wash"],
    "address": "123 Main St",
    "date": "2024-01-15",
    "timeSlot": "10:00 AM - 11:00 AM",
    "name": "John Doe",
    "phone": "1234567890",
    "notes": "Please call before arrival"
  }'
```

**Login:**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "password": "admin123"
  }'
```

### Using Postman

1. Import the API endpoints as a collection
2. Set base URL: `http://localhost:5000/api`
3. For protected routes, add Authorization header with Bearer token

## 🏗️ Project Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── bookingController.js  # Booking operations
│   ├── employeeController.js # Employee management
│   ├── adminController.js    # Admin operations
│   └── contactController.js  # Contact form handling
├── middleware/
│   └── auth.js               # JWT verification & authorization
├── models/
│   ├── User.js               # User schema
│   ├── Booking.js            # Booking schema
│   └── Contact.js            # Contact schema
├── routes/
│   ├── auth.js               # Auth routes
│   ├── bookings.js           # Booking routes
│   ├── employees.js          # Employee routes
│   ├── admin.js              # Admin routes
│   ├── contact.js            # Contact routes
│   └── services.js           # Service routes
├── utils/
│   └── seedData.js           # Database seeding script
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore file
├── package.json              # Dependencies
├── server.js                 # Express server setup
└── README.md                 # Documentation
```

## 🔧 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with test data

## 🌐 CORS Configuration

The API is configured to accept requests from the frontend at `http://localhost:5173` by default. To change this, update the `FRONTEND_URL` in your `.env` file.

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control
- Input validation
- Secure HTTP headers
- CORS protection

## 📝 Environment Variables

| Variable       | Description               | Default                                    |
| -------------- | ------------------------- | ------------------------------------------ |
| `PORT`         | Server port               | 5000                                       |
| `NODE_ENV`     | Environment mode          | development                                |
| `MONGODB_URI`  | MongoDB connection string | mongodb://localhost:27017/aquaflow-booking |
| `JWT_SECRET`   | Secret key for JWT        | (required)                                 |
| `JWT_EXPIRE`   | JWT expiration time       | 7d                                         |
| `FRONTEND_URL` | Frontend URL for CORS     | http://localhost:5173                      |

## 🐛 Troubleshooting

### MongoDB Connection Error

- Make sure MongoDB is running
- Check if `MONGODB_URI` is correct in `.env`
- Verify MongoDB service is accessible

### JWT Authentication Error

- Ensure `JWT_SECRET` is set in `.env`
- Check if token is properly formatted in Authorization header
- Verify token hasn't expired

### Port Already in Use

- Change `PORT` in `.env` file
- Or stop the process using the port

## 📄 License

ISC

## 👥 Contact

For any questions or support, please contact the development team.

---

Built with ❤️ using Express.js, MongoDB, and Node.js
