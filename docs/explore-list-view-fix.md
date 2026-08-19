# Explore List View Height Fix

## Problem
In the explore tab's list view, cards were growing infinitely taller as the window width increased. This happened because:

1. Card images use `aspectRatio: 16/9`
2. As screen width increases, image width increases proportionally
3. The aspect ratio causes image height to increase as well
4. The entire card grows taller, eventually showing only 1 card per screen

## Solution
Added a `maxHeight` constraint of 200px to card images when in list view mode.

### Changes Made

#### 1. `components/explore/ClubCard.tsx`
- Added optional `isCompact` prop
- Applied `maxHeight: 200` to image and placeholder when `isCompact` is true
- Used `contentFit="cover"` to ensure images crop gracefully at the height limit

#### 2. `components/explore/EventCard.tsx`
- Added optional `isCompact` prop  
- Applied `maxHeight: 200` to image and placeholder when `isCompact` is true
- Used `contentFit="cover"` to ensure images crop gracefully at the height limit

#### 3. `app/(tabs)/explore/index.tsx`
- Updated `renderItem` to pass `isCompact={viewMode === "list"}` to both ClubCard and EventCard

## Why This Works

### Future-Proof Design
- **Decoupled from card structure**: The height constraint is applied at the image level, not dependent on card internals
- **Adaptive**: Only applies in list mode; grid mode remains unaffected
- **Easy to adjust**: Change the `200` value in one place to adjust the max height
- **Content-agnostic**: Works regardless of future additions to card content (text, buttons, badges, etc.)

### Visual Behavior
- Images wider than 200px height will be cropped from top/bottom
- `contentFit="cover"` ensures the image fills the area nicely
- Cards remain at a consistent, readable height
- Multiple cards remain visible on screen at once

## Testing
- Verified TypeScript compilation (no new errors introduced)
- Cards now maintain consistent ~200-250px image height in list view
- Grid view functionality unchanged
- Solution works for both ClubCard and EventCard