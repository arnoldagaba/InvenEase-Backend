# Authentication and Authorization Module

This module handles all authentication and authorization functionality for the Inventory Management System.

## Features

### Authentication
- User registration with email verification
- Login with JWT tokens (access and refresh)
- Password reset functionality
- Account locking after failed attempts
- Session management
- Remember me functionality
- Email verification
- Password change

### Authorization
- Role-based access control (ADMIN, MANAGER, STAFF)
- Token validation and verification
- IP and device tracking
- Activity logging

### Security
- Password hashing with bcrypt
- JWT token management
- Rate limiting
- Account locking
- Security logging
- Audit trails

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "name": "John Doe",
  "role": "STAFF",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "rememberMe": true
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "password": "NewStrongP@ss123"
}
```

#### Change Password
```http
POST /api/auth/change-password
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "currentPassword": "CurrentP@ss123",
  "newPassword": "NewStrongP@ss123"
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json
Cookie: refresh_token=<refresh-token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

## Middleware Usage

### Authentication Middleware
```typescript
import { authenticate } from '../../common/middleware/auth.middleware';

// Protect a route
router.get('/protected', authenticate, (req, res) => {
  // Access authenticated user data
  const userId = req.user.id;
  const userRole = req.user.role;
});
```

### Authorization Middleware
```typescript
import { authorize } from '../../common/middleware/auth.middleware';
import { Role } from '../../generated/prisma/client';

// Protect a route with role-based access
router.get('/admin-only', 
  authenticate,
  authorize([Role.ADMIN]),
  (req, res) => {
    // Only admins can access this route
  }
);
```

## Security Features

### Password Requirements
- Minimum 8 characters
- Maximum 100 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Management
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Email verification tokens expire after 24 hours
- Password reset tokens expire after 1 hour

### Rate Limiting
- Login: 5 attempts per 15 minutes
- Password reset: 3 attempts per hour

### Account Locking
- Account is locked after 5 failed login attempts
- Lock duration: 15 minutes

## Error Handling

The module uses a standardized error response format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

Common error codes:
- `AUTH_FAILED_NO_TOKEN`: No authentication token provided
- `AUTH_FAILED_INVALID_TOKEN`: Invalid or expired token
- `AUTH_FAILED_INVALID_TOKEN_TYPE`: Wrong token type used
- `AUTH_FAILED_INVALIDATED_TOKEN`: Token has been revoked
- `AUTH_FAILED_USER_NOT_FOUND`: User not found
- `AUTH_FAILED_INACTIVE_USER`: User account is inactive
- `AUTH_FAILED_LOCKED_ACCOUNT`: Account is locked
- `AUTHZ_FAILED_INSUFFICIENT_PERMISSIONS`: User lacks required permissions

## Logging

The module logs various security and audit events:

### Security Events
- Failed login attempts
- Account lockouts
- Token invalidations
- Password changes
- Email verification

### Audit Events
- Successful logins
- Role changes
- Account status changes
- Password resets

## Best Practices

1. Always use HTTPS in production
2. Implement proper CORS policies
3. Use secure cookie settings
4. Implement proper session management
5. Regular security audits
6. Monitor failed login attempts
7. Keep dependencies updated
8. Follow OWASP security guidelines 