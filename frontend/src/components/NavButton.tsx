import { Link } from "react-router";
import styles from "../styles/NavButton.module.css";

interface NavButtonProps {
  to: string;
  direction: "prev" | "next";
  label: string;
  title: string;
}

const NavButton = ({ to, direction, label, title }: NavButtonProps) => {
  const arrow = direction === "prev" ? "←" : "→";
  const buttonClass = `${styles.navButton} ${styles[direction]}`;
  const contentClass = `${styles.navButtonContent} ${direction === "next" ? styles.flexEnd : ""}`;

  return (
    <Link to={to} className={buttonClass}>
      <div className={contentClass}>
        <span className={styles.navArrow}>{arrow}</span>
        <div className={styles.navText}>
          <span className={styles.navLabel}>{label}</span>
          <span className={styles.navTitle}>{title}</span>
        </div>
      </div>
    </Link>
  );
};

export default NavButton;
