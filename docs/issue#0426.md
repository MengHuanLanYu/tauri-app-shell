**修订版 Issue / PR 说明**

Title: Support controlled `rightPanel` state in `AppShell`

We want to upgrade `AppShell`’s third column from an internally managed auxiliary panel into a reusable right-side workspace that can also be controlled by the host app.

Current behavior:
- `rightPanel` provides the panel content
- `defaultRightPanelOpen` only supports uncontrolled initial state
- the open/close state is mainly managed inside `AppShell`
- `rightPanelToggle` is currently tied to the shell’s internal behavior model

This works for simple cases, but it is limiting for real app modules where the third column should be driven by business state.

Target use cases:
- Password module: third column shows credential details
- Settings module: third column shows contextual help / preview
- Toolbox module: third column shows results / history / inspector
- Other modules may use the third column for different content

Because of this, `AppShell` should not assume the right panel is only an internal shell-level toggle panel. It should support both uncontrolled and controlled usage.

**Requested API**
```ts
interface AppShellProps {
  rightPanel?: React.ReactNode;

  rightPanelOpen?: boolean;
  defaultRightPanelOpen?: boolean;
  onRightPanelOpenChange?: (open: boolean) => void;

  rightPanelToggle?: React.ReactNode | false;
}
```

**Behavior model**
- If `rightPanelOpen` is provided, `AppShell` works in controlled mode
- If `rightPanelOpen` is not provided, `AppShell` keeps the current uncontrolled behavior using internal state and `defaultRightPanelOpen`
- Clicking the built-in right-panel toggle should always go through a single setter path
- In uncontrolled mode, that setter updates internal state
- In controlled mode, that setter only calls `onRightPanelOpenChange`

Suggested internal logic:
```ts
const isRightPanelControlled = rightPanelOpen !== undefined;
const actualRightPanelOpen = isRightPanelControlled ? rightPanelOpen : innerRightPanelOpen;

function setRightPanelOpen(next: boolean) {
  if (!isRightPanelControlled) {
    setInnerRightPanelOpen(next);
  }
  onRightPanelOpenChange?.(next);
}
```

**`rightPanelToggle` contract**
To keep the API consistent and semantically clear:

- `rightPanelToggle === false`
  - never render a right-panel toggle

- `rightPanelToggle === undefined`
  - if `rightPanel` exists, render the built-in toggle
  - built-in toggle must use `setRightPanelOpen(...)`

- `rightPanelToggle` is a custom `ReactNode`
  - render the custom toggle only when `rightPanel` exists
  - the custom node is caller-owned; `AppShell` does not inject toggle behavior into arbitrary nodes
  - if the host app needs a generic toolbar action unrelated to panel open/close, it should use `titlebarRight`, not `rightPanelToggle`

This keeps `rightPanelToggle` aligned with the meaning of “toggle the right panel”, instead of becoming a generic toolbar slot.

**Rendering rules**
1. If `rightPanel` is `undefined` or empty:
- do not render the right panel area
- do not render the right-side resize handle
- do not render the built-in right-panel toggle
- do not render a custom `rightPanelToggle` either

2. If `rightPanel` exists and `actualRightPanelOpen === false`:
- keep the panel in collapsed state
- do not render the right-side resize handle while collapsed
- toggle visibility still follows the `rightPanelToggle` contract above

3. If `rightPanel` exists and `actualRightPanelOpen === true`:
- render the panel normally
- render the right-side resize handle normally

The resize-handle rule is important here: a collapsed panel should not leave behind an active or ghost resize target.

**Why this matters**
In NovaVault, the password module is a real three-column layout:
- first column: global navigation
- second column: password list
- third column: password detail

The third column should open and close based on business state:
- no selected item → right panel closed
- selected item → right panel open

Example desired usage:
```tsx
<AppShell
  sidebar={<MainNav />}
  rightPanel={selectedPassword ? <PasswordDetail /> : undefined}
  rightPanelOpen={!!selectedPassword}
  rightPanelToggle={false}
>
  <PasswordList />
</AppShell>
```

This change keeps backward compatibility while making the third column usable as a general-purpose right-side workspace across modules.