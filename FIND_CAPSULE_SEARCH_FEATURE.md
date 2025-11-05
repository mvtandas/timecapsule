# Find a Capsule! - User Search Feature

## ✅ Implemented Features

### 1. **Relocated "Find a Capsule!" Section**
- Moved below **"My Friends"** section on the landing page
- Consistent spacing and styling with existing layout

### 2. **Username Search Functionality**
- Search input with placeholder: `"Search by username"`
- Real-time search with **300ms debounce** for better performance
- Minimum 2 characters required to trigger search
- Searches **Supabase `profiles` table** by username (case-insensitive)

### 3. **Autocomplete Dropdown**
- Displays **matching usernames** from database
- Each result shows:
  - Profile avatar (or placeholder)
  - Username (with @ prefix)
  - Display name (optional)
  - Chevron forward icon
- Limited to **10 results** for performance
- Positioned below input with smooth shadow

### 4. **Interaction**
- Tap on a user → **navigates to their profile page**
- Passes user data to `FriendProfile` screen
- Dropdown closes automatically on selection
- Search query clears on selection

### 5. **Empty States**
- **No results**: Shows icon + "No users found" message
- **Loading state**: Spinner appears while searching

---

## 📐 Layout Structure

```
Landing Page
├── Map View
├── Bottom Sheet
│   ├── Search (capsule search)
│   ├── Service Cards (Create/My Capsules)
│   ├── Info Banner
│   ├── My Friends Section  ← Existing
│   └── Find a Capsule! Section  ← NEW (below My Friends)
│       ├── Title: "Find a Capsule!"
│       ├── Search Input (Search by username)
│       └── Dropdown (autocomplete results)
```

---

## 🔧 Technical Implementation

### State Management
```typescript
const [userSearchQuery, setUserSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<any[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [showSearchDropdown, setShowSearchDropdown] = useState(false);
const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

### Search Function (Debounced)
```typescript
const searchUsers = async (query: string) => {
  if (!query || query.trim().length < 2) {
    setSearchResults([]);
    setShowSearchDropdown(false);
    return;
  }

  try {
    setIsSearching(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${query.trim()}%`)
      .limit(10);

    if (error) {
      console.error('Search error:', error);
      return;
    }

    setSearchResults(data || []);
    setShowSearchDropdown(true);
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    setIsSearching(false);
  }
};
```

### Debounce Handler
```typescript
const handleUserSearch = (text: string) => {
  setUserSearchQuery(text);
  
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }

  // 300ms debounce
  searchTimeoutRef.current = setTimeout(() => {
    searchUsers(text);
  }, 300);
};
```

### User Selection
```typescript
const handleUserSelect = (user: any) => {
  setShowSearchDropdown(false);
  setUserSearchQuery('');
  setSearchResults([]);
  onNavigate('FriendProfile', { friend: user });
};
```

---

## 🎨 UI Components

### Search Input
```tsx
<View style={styles.userSearchInputWrapper}>
  <Ionicons name="search" size={20} color="#94a3b8" />
  <TextInput
    placeholder="Search by username"
    value={userSearchQuery}
    onChangeText={handleUserSearch}
    autoCapitalize="none"
    autoCorrect={false}
  />
  {isSearching && <ActivityIndicator color="#FAC638" />}
</View>
```

### Dropdown Results
```tsx
<View style={styles.searchDropdown}>
  {searchResults.length > 0 ? (
    <ScrollView nestedScrollEnabled={true}>
      {searchResults.map((user) => (
        <TouchableOpacity onPress={() => handleUserSelect(user)}>
          <Image source={{ uri: user.avatar_url }} />
          <Text>@{user.username}</Text>
          <Text>{user.display_name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  ) : (
    <View>
      <Ionicons name="search-outline" />
      <Text>No users found</Text>
    </View>
  )}
</View>
```

---

## 🎨 Styling

### Find a Capsule Section
```javascript
findCapsuleSection: {
  marginTop: 32,
  paddingHorizontal: 16,
  marginBottom: 24,
}

findCapsuleTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#1e293b',
  marginBottom: 16,
}
```

### Search Input
```javascript
userSearchInputWrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'white',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}
```

### Dropdown
```javascript
searchDropdown: {
  position: 'absolute',
  top: 60,
  left: 0,
  right: 0,
  backgroundColor: 'white',
  borderRadius: 12,
  maxHeight: 300,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 8,
  zIndex: 1001,
}
```

### Result Item
```javascript
searchResultItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f1f5f9',
}

searchResultAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 12,
}
```

---

## ⚡ Performance Optimizations

1. **Debouncing**: 300ms delay prevents excessive API calls
2. **Minimum Length**: 2 characters required before search
3. **Result Limit**: Maximum 10 results returned
4. **Nested ScrollView**: `nestedScrollEnabled={true}` for smooth scrolling
5. **Keyboard Persistence**: `keyboardShouldPersistTaps="handled"`

---

## 🔍 Search Logic

### Query Pattern
- Uses Supabase `.ilike()` for **case-insensitive** search
- Pattern: `%{query}%` (matches anywhere in username)
- Examples:
  - Search: `"bat"` → Matches: `batu`, `batman`, `combat`
  - Search: `"john"` → Matches: `john`, `johndoe`, `littlejohn`

### Fields Fetched
```sql
SELECT id, username, display_name, avatar_url
FROM profiles
WHERE username ILIKE '%{query}%'
LIMIT 10
```

---

## 📱 User Flow

1. **User scrolls to "Find a Capsule!" section**
2. **Taps on search input**
3. **Types username** (e.g., "bat")
4. **System waits 300ms** (debounce)
5. **Query sent to Supabase** (`profiles` table)
6. **Results appear in dropdown** (max 10)
7. **User taps a result**
8. **Navigates to that user's profile**
9. **Dropdown closes, query clears**

---

## 🎯 Edge Cases Handled

1. **Empty Query**: Dropdown hidden, no API call
2. **< 2 Characters**: No search triggered
3. **No Results**: Shows "No users found" message
4. **Loading**: Spinner visible during search
5. **API Error**: Logged to console, graceful failure
6. **Rapid Typing**: Debounced, only final query sent

---

## ✅ Features Checklist

- [x] Relocated "Find a Capsule!" below "My Friends"
- [x] Username search input with placeholder
- [x] Autocomplete dropdown
- [x] Show username + avatar + display name
- [x] Navigate to user profile on tap
- [x] Debounce (300ms) for performance
- [x] Loading indicator
- [x] Empty state ("No users found")
- [x] Nested scrolling support
- [x] Keyboard handling
- [x] Case-insensitive search
- [x] Limit results to 10
- [x] Clear query on selection
- [x] Close dropdown on selection

---

## 🧪 Testing

### Test Cases:
1. **Type 1 character** → No search, no dropdown
2. **Type 2+ characters** → Search triggers, dropdown appears
3. **Type "bat"** → Results with "bat" in username
4. **No matches** → "No users found" message
5. **Tap result** → Navigate to profile
6. **Rapid typing** → Only final query sent (debounced)
7. **Scroll dropdown** → Smooth scrolling
8. **Tap outside** → Dropdown stays (user must clear or select)

---

## 📊 Database Requirements

### Supabase Table: `profiles`
Required columns:
- `id` (UUID, primary key)
- `username` (TEXT, unique)
- `display_name` (TEXT, nullable)
- `avatar_url` (TEXT, nullable)

### RLS Policy
Make sure users can **read** other profiles for search:
```sql
CREATE POLICY "Anyone can read profiles for username lookup"
  ON profiles FOR SELECT
  TO public
  USING (true);
```

---

## 🎉 Result

Users can now:
✅ Search for other users by username  
✅ View search results in real-time  
✅ Navigate to any user's profile  
✅ Discover friends and explore capsules  

Perfect for social discovery and finding capsules! 🚀

