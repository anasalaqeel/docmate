import React from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  copyDuration?: number;
  fadeOutDuration?: number;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  className = "",
  buttonClassName = "",
  iconClassName = "w-4 h-4",
  copyDuration = 1700,
  fadeOutDuration = 300,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [fadingOut, setFadingOut] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFadingOut(false);

      setTimeout(() => {
        setFadingOut(true);
        setTimeout(() => {
          setCopied(false);
          setFadingOut(false);
        }, fadeOutDuration);
      }, copyDuration);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Add custom keyframe animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes checkPop {
        0% { transform: scale(0) rotate(-180deg); opacity: 0; }
        50% { transform: scale(1.2) rotate(10deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={copyToClipboard}
        className={`absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-opacity duration-300 ease-out hover:scale-105 active:scale-95 ${
          copied && !fadingOut ? 'opacity-100' : fadingOut ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
        } ${buttonClassName}`}
        aria-label={copied ? "Copied!" : "Copy"}
      >
        {copied || fadingOut ? (
          <Check
            className={`${iconClassName} text-[var(--docmate-success)]`}
            style={{
              animation: fadingOut ? 'none' : 'checkPop 0.6s ease-in-out'
            }}
          />
        ) : (
          <Copy className={iconClassName} />
        )}
      </button>
    </div>
  );
};

export default CopyButton;