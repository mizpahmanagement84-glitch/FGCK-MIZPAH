# Secretary Role Implementation - Session-Based Data Visibility

## Overview
This implementation provides role-based access control for the Secretary with session-specific data visibility. The Secretary can record data across all modules but only sees session-specific history for temporary records and permanent history for special modules.

## Features Implemented

### Secretary Permissions

#### **Can Record:**
- ✅ Attendance
- ✅ Offering (Givings)
- ✅ Welfare
- ✅ Tithe
- ✅ Expenses
- ✅ Inventory
- ✅ Departments (Department Transactions)
- ✅ Projects

#### **Can View History:**

**Permanent History (visible until deleted):**
- ✅ Welfare (all records visible)
- ✅ Projects (all records visible)

**Session-Scoped History (disappears on logout):**
- ✅ Attendance (visible only during current session)
- ✅ Offering/Givings (visible only during current session)
- ✅ Tithe (visible only during current session)
- ✅ Expenses (visible only during current session)
- ✅ Inventory (visible only during current session)
- ✅ Departments/Transactions (visible only during current session)

## How It Works

### 1. Session ID Generation
When a Secretary (or any user) logs in, a unique session ID is generated:
```javascript
const generateSessionId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
};
```

This session ID is embedded in the JWT token and expires when the token expires (8 hours by default).

### 2. Data Filtering
For session-scoped records (Attendance, Givings, Tithes, Expenses, Inventory, Department Transactions):

**GET Requests:**
- If user is Secretary: Returns only records created during the current session (matching sessionId)
- If user is Pastor/Admin: Returns all records
- If user is Member: Returns based on existing role-based rules
- If user is Elder: Returns based on existing role-based rules

**POST Requests:**
- If user is Secretary: Attaches the sessionId to the record
- All other roles: No sessionId attached (or existing behavior maintained)

**PUT Requests:**
- If user is Secretary: Updates sessionId to current session
- All other roles: Existing behavior maintained

### 3. Permanent History Routes
Welfare and Projects routes do **NOT** filter by sessionId:
- All records are visible to authorized users regardless of session
- No sessionId is attached to these records
- Provides permanent record-keeping for these critical areas

## Technical Implementation

### Files Modified

#### 1. **server/routes/auth.js**
- Added `generateSessionId()` function
- Includes `sessionId` in JWT payload for all user types
- Session ID changes on each login

#### 2. **server/routes/attendance.js**
- GET: Filters by sessionId if user is secretary
- POST: Attaches sessionId if user is secretary
- PUT: Updates sessionId if user is secretary

#### 3. **server/routes/givings.js**
- GET: Filters by sessionId if user is secretary (before member filtering)
- POST: Attaches sessionId if user is secretary
- PUT: Attaches sessionId if user is secretary

#### 4. **server/routes/tithes.js**
- GET: Filters by sessionId if user is secretary (before member filtering)
- POST: Attaches sessionId if user is secretary
- PUT: Attaches sessionId if user is secretary

#### 5. **server/routes/expenses.js**
- GET: Filters by sessionId if user is secretary
- POST: Attaches sessionId if user is secretary
- PUT: Attaches sessionId if user is secretary (though only pastor can edit)

#### 6. **server/routes/inventory.js**
- GET: Filters by sessionId if user is secretary
- POST: Attaches sessionId if user is secretary
- PUT: Attaches sessionId if user is secretary

#### 7. **server/routes/department-transactions.js**
- GET: Filters by sessionId if user is secretary
- POST/PUT: sessionId handled via updated audit utility

#### 8. **server/utils/audit.js**
- Added `getSecretarySessionId()` function
- Updated `attachRecordedBy()` to attach sessionId for secretaries
- Works alongside existing elder audit trail functionality

#### 9. **server/routes/welfare.js**
- ✅ No changes needed
- Members see only their contributions
- Secretaries see all welfare records (permanent history)

#### 10. **server/routes/projects.js**
- ✅ No changes needed
- All authorized users see all projects (permanent history)

## Database Considerations

### New Fields
Records created by secretaries will now include a `sessionId` field:
```javascript
{
  id: 1,
  date: "2024-01-15",
  amount: 1000,
  sessionId: "1705244400000-abcd1234",  // Added for secretaries
  // other fields...
}
```

### Backward Compatibility
- Existing records without `sessionId` are not filtered (ensures historical data access)
- Mixed records with and without `sessionId` are handled gracefully
- No database schema changes required (file-based or SQL)

## User Experience Flow

### Secretary Login & Work Session
1. Secretary logs in → System generates unique sessionId → Secretary sees dashboard
2. Secretary creates Attendance record → Record saved with sessionId
3. Secretary can view today's Attendance records during session
4. Secretary creates Welfare record → Record saved (NO sessionId)
5. Secretary views Welfare → Sees all historical welfare records
6. Secretary logs out → Session ends, sessionId becomes invalid

### When Secretary Logs Back In
1. Secretary logs in again → System generates NEW sessionId
2. Previous records with old sessionId are NOT visible anymore
3. New records will have new sessionId
4. Welfare and Project records remain visible (not session-dependent)

## Testing Checklist

- [ ] Secretary can login successfully
- [ ] Secretary can record Attendance
- [ ] Secretary can see Attendance records created in current session
- [ ] Secretary cannot see Attendance records from previous sessions
- [ ] Secretary can record Offering (Givings)
- [ ] Secretary can see Offering records created in current session
- [ ] Secretary can record Welfare
- [ ] Secretary can see ALL Welfare records (permanent history)
- [ ] Secretary can record Tithe
- [ ] Secretary can see Tithe records created in current session
- [ ] Secretary can record Expenses
- [ ] Secretary can see Expenses records created in current session
- [ ] Secretary can record Inventory
- [ ] Secretary can see Inventory records created in current session
- [ ] Secretary can record Departments
- [ ] Secretary can see Departments records created in current session
- [ ] Secretary can record Projects
- [ ] Secretary can see ALL Projects records (permanent history)
- [ ] After logout and re-login, session-scoped records disappear
- [ ] Pastor can see all records across all sessions
- [ ] Members see their own records (existing behavior)
- [ ] Elders see records based on existing rules

## Security Notes

1. **Session ID Validation**: Session ID is validated through JWT token verification
2. **No Manual Session Management**: Session ID is tied to JWT expiration (8 hours default)
3. **Server-Side Filtering**: All filtering happens on the server (secure)
4. **Token Tampering**: Tampered tokens are rejected during JWT verification

## API Response Examples

### GET /api/attendance (Secretary with records in current session)
```json
[
  {
    "id": 1,
    "date": "2024-01-15",
    "category": "Adults",
    "total": 45,
    "sessionId": "1705244400000-abcd1234"
  }
]
```

### GET /api/welfare (Secretary - shows all)
```json
[
  {
    "id": 1,
    "beneficiaryId": 5,
    "beneficiaryName": "John Doe",
    "amount": 500,
    "date": "2024-01-14T10:00:00.000Z"
  },
  {
    "id": 2,
    "beneficiaryId": 6,
    "beneficiaryName": "Jane Smith",
    "amount": 250,
    "date": "2024-01-15T14:30:00.000Z"
  }
]
```

## Future Enhancements

1. Add session timeout warning before token expiration
2. Implement session history/audit log viewer
3. Allow pastors to view secretary sessions separately
4. Add session length customization per role
5. Implement session-based reporting for secretaries

## Troubleshooting

### Secretary seeing old records after login
- Check that token is properly refreshed on login
- Verify JWT expiration is correctly set
- Ensure sessionId is different on each login

### Records disappearing unexpectedly
- Confirm token is still valid (hasn't expired)
- Check browser console for authentication errors
- Verify server is not clearing sessionId

### Secretary cannot see welfare/projects
- Verify secretary has appropriate permissions
- Check welfare/projects routes for role-based restrictions
- Ensure records are properly saved in database

## Support & Questions
For issues or questions about this implementation, refer to the specific route files or the authentication configuration.
