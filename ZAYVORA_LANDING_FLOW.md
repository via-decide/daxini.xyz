# Zayvora Landing & Entry Flow

## Overview

Complete user journey from landing page to chat workspace with intelligent routing based on authentication and onboarding state.

---

## The User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Landing Page (/)                             │
│                  "Try Zayvora" Button (Green)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Click
                           ▼
        ┌──────────────────────────────────────┐
        │   Check zayvora_token in localStorage │
        └──────────────────────────────────────┘
                    │              │
         No Token   │              │   Token Found
                    ▼              ▼
            ┌──────────────┐   ┌──────────────────────┐
            │ /login       │   │ Check zayvora_onboarding │
            │              │   │ localStorage             │
            └──────────────┘   └──────────────────────┘
                    │              │              │
         Successful │              │ Not Found    │ Found
         Login      │              ▼              ▼
                    │         /zayvora-onboarding  /zayvora-chat
                    │              │
                    └──────────────┴───────────────┐
                                                   │
                              Complete 4-step onboarding
                              Set zayvora_onboarding flag
                                                   │
                                                   ▼
                                          /zayvora-chat (Workspace)
```

---

## Components

### 1. Landing Page Enhancement (index.html)

**Added:**
- Green "Try Zayvora →" button in hero section
- Hover animation (lift + shadow)
- Click handler routing logic

**Styling:**
- Green gradient: `#4CAF50 → #45a049`
- Large button: 1.1rem font, 1rem × 3rem padding
- Hover: Lift 4px with enhanced shadow
- Margin-bottom: 3rem (spacing below button)

**JavaScript Logic:**
```javascript
function launchZayvora() {
  const authToken = localStorage.getItem('zayvora_token');
  const onboardingComplete = localStorage.getItem('zayvora_onboarding');

  if (!authToken) window.location.href = '/login';
  if (!onboardingComplete) window.location.href = '/zayvora-onboarding';
  window.location.href = '/zayvora-chat';
}
```

---

### 2. Login Integration (zayvora-login/index.html)

**Updated:**
- Redirect after successful login to check onboarding state
- New function: `redirectAfterLogin()`

**Behavior:**
```javascript
function redirectAfterLogin() {
  setTimeout(() => {
    const onboardingComplete = localStorage.getItem('zayvora_onboarding');
    if (onboardingComplete) {
      window.location.href = '/zayvora-chat';
    } else {
      window.location.href = '/zayvora-onboarding';
    }
  }, 1000);
}
```

**Flow:**
1. User logs in successfully
2. Token saved to localStorage
3. Check if onboarding complete
   - If yes: → Chat workspace
   - If no: → Onboarding flow

---

### 3. Chat Workspace (zayvora-chat/index.html)

**Route Protection:**
- Includes `route-guard.js` from onboarding
- Auto-redirects if:
  - No `zayvora_token` → `/login`
  - No `zayvora_onboarding` → `/zayvora-onboarding`

**User Interface:**
- Header with user info (email)
- Credit balance badge (fetched from API)
- Logout button
- Workspace area with task launcher

**Credit Checking:**
```javascript
async function checkCredits() {
  const response = await fetch(`/api/user-wallet/{user_id}`);
  const data = await response.json();
  
  if (data.available_credits === 0) {
    // Show "No Credits" alert
    // Offer "Buy Credits" button → /zayvora-pricing
  }
}
```

**Credit States:**
- **Credits > 0:** Show balance, enable tasks
- **Credits = 0:** Show warning alert, disable tasks, link to pricing

**Logout:**
- Clears `zayvora_token`
- Clears `zayvora_onboarding`
- Clears `zayvora_workspace`
- Redirects to `/`

---

## LocalStorage State

### Authentication State
```javascript
zayvora_token: {
  user_id: "user123",
  email: "user@example.com",
  timestamp: 1712249100000,
  signature: "hash"
}
```

### Onboarding State
```javascript
zayvora_onboarding: {
  completed: true,
  completedAt: "2026-04-04T16:45:00Z",
  workspace: "repo" | "files" | "empty"
}
```

### Workspace State
```javascript
zayvora_workspace: {
  type: "repo" | "files" | "empty",
  url: "https://github.com/...",
  structure: { /* repo analysis */ },
  analyzedAt: "2026-04-04T16:45:00Z"
}
```

---

## API Endpoints Required

### GET /api/user-wallet/{user_id}
Fetch user credit balance for display in chat header.

**Response:**
```json
{
  "success": true,
  "user_id": "user123",
  "total_credits": 120,
  "available_credits": 120,
  "pending_credits": 0
}
```

### GET /api/repo-analyze (Optional)
Analyze GitHub repository structure for workspace setup.

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "success": true,
  "structure": {
    "files": 142,
    "folders": 23,
    "main_language": "JavaScript",
    "has_tests": true,
    "has_docs": true
  }
}
```

---

## URL Routes

| Route | Purpose | Protection |
|-------|---------|-----------|
| `/` | Landing page | None |
| `/login` | Login form | Auto-redirect if logged in |
| `/zayvora-onboarding` | 4-step onboarding | Requires auth |
| `/zayvora-chat` | Chat workspace | Requires auth + onboarding |
| `/zayvora-pricing` | Credit purchase | None |

---

## Vercel Configuration

Updated `vercel.json` rewrites:
```json
{
  "source": "/zayvora-onboarding",
  "destination": "/zayvora-onboarding/index.html"
},
{
  "source": "/zayvora-chat",
  "destination": "/zayvora-chat/index.html"
}
```

---

## Testing Checklist

### Landing Page
- [ ] "Try Zayvora" button visible in hero
- [ ] Button hover animation works
- [ ] Click routes to correct page based on state

### New User (No Token)
- [ ] Click "Try Zayvora" → redirects to `/login`
- [ ] Login successful
- [ ] Redirected to `/zayvora-onboarding`

### Onboarding Flow
- [ ] Complete all 4 steps
- [ ] `zayvora_onboarding` flag set in localStorage
- [ ] Click "Enter Workspace" → redirects to `/zayvora-chat`

### Chat Workspace
- [ ] Route protection active (try accessing directly)
- [ ] User email displays correctly
- [ ] Credit balance shows (if API available)
- [ ] "Buy Credits" button appears if credits = 0
- [ ] Logout clears all flags and redirects to home

### Edge Cases
- [ ] Token exists but onboarding incomplete
  - Click "Try Zayvora" → should go to onboarding
- [ ] Token and onboarding exist
  - Click "Try Zayvora" → should go to chat directly
- [ ] Clear localStorage and try accessing chat
  - Should redirect to login

---

## Visual Design

### Landing Button
- **Color:** Green gradient (#4CAF50 → #45a049)
- **Size:** Large (1.1rem font)
- **Animation:** Lift 4px on hover, enhanced shadow
- **Placement:** Below tagline, above cards grid

### Chat Header
- **Layout:** Flexbox, space-between
- **Elements:** Title, user info, credits badge, logout
- **Badge:** Purple gradient, rounded pill shape
- **Responsive:** Stack vertically on mobile

### No Credits Alert
- **Style:** Red warning gradient background
- **Icon:** ⚠️ emoji
- **Content:** Title + description + action button
- **Placement:** Above workspace area

---

## Security Considerations

1. **Token Validation:** Check token exists before accessing protected routes
2. **localStorage Flags:** Used for client-side navigation only
3. **Credit Checking:** Always fetch fresh from API (not cached)
4. **Logout:** Clear all stored flags to prevent access
5. **CORS:** Ensure API endpoints accessible from Vercel domain

---

## Future Enhancements

- [ ] Remember user's last workspace on revisit
- [ ] Show onboarding progress if user navigates back
- [ ] Add credit spending tracker in chat
- [ ] Implement task history
- [ ] Add workspace switcher for multiple projects
- [ ] Email verification flow
- [ ] Two-factor authentication

---

## Files Modified

1. **index.html** — Added Try Zayvora button + routing logic
2. **zayvora-login/index.html** — Updated login redirect
3. **zayvora-chat/index.html** — New chat workspace (NEW)
4. **zayvora-onboarding/route-guard.js** — Route protection (existing)
5. **vercel.json** — Already includes /zayvora-chat rewrite

---

## Summary

Users can now launch into the Zayvora experience directly from the landing page. The system intelligently routes them through the appropriate flow based on their current state:
- New users go through login → onboarding → chat
- Returning users skip already-completed steps
- All routes are protected with automatic redirects
- Credit balance is checked and displayed
- Logout is available in the chat workspace

The entire user journey is seamless and guided by the localStorage state flags.
