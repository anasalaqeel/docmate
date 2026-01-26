import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';
import { css } from '@emotion/css';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md', 
  variant = 'light',
  showLabel = false 
}) => {
  const { theme, setTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className={styles.icon} />;
      case 'dark':
        return <MoonIcon className={styles.icon} />;
      case 'system':
        return <ComputerDesktopIcon className={styles.icon} />;
      default:
        return <SunIcon className={styles.icon} />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant={variant}
          size={size}
          startContent={getThemeIcon()}
          className={styles.toggleButton}
        >
          {showLabel && getThemeLabel()}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Theme selection"
        selectedKeys={[theme]}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const selectedTheme = Array.from(keys)[0] as 'light' | 'dark' | 'system';
          setTheme(selectedTheme);
        }}
      >
        <DropdownItem
          key="light"
          startContent={<SunIcon className={styles.menuIcon} />}
          className={styles.menuItem}
        >
          Light
        </DropdownItem>
        <DropdownItem
          key="dark"
          startContent={<MoonIcon className={styles.menuIcon} />}
          className={styles.menuItem}
        >
          Dark
        </DropdownItem>
        <DropdownItem
          key="system"
          startContent={<ComputerDesktopIcon className={styles.menuIcon} />}
          className={styles.menuItem}
        >
          System
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

// Emotion CSS styles
const styles = {
  toggleButton: css`
    min-width: fit-content;
    transition: all 0.2s ease-in-out;

    &:hover {
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.98);
    }
  `,

  icon: css`
    width: 1.25rem;
    height: 1.25rem;
    transition: all 0.3s ease-in-out;
  `,

  menuItem: css`
    transition: all 0.2s ease-in-out;

    &:hover {
      background-color: var(--heroui-default-100);
      transform: translateX(4px);
    }

    &[data-selected="true"] {
      background-color: var(--heroui-primary-50);
      color: var(--heroui-primary);
      font-weight: 500;
    }
  `,

  menuIcon: css`
    width: 1rem;
    height: 1rem;
    transition: all 0.2s ease-in-out;
  `
};