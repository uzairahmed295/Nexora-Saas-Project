import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOnline } from "../services/network";
export function NetworkBanner() {
  const online = useOnline();
  const prior = useRef(online);
  const [back, setBack] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (online && !prior.current) {
      setBack(true);
      timer = setTimeout(() => setBack(false), 4500);
    }
    if (!online) setBack(false);
    prior.current = online;
    return () => clearTimeout(timer);
  }, [online]);
  if (online && !back) return null;
  return (
    <div
      role="status"
      className={`network-banner ${online ? "online" : "offline"}`}
    >
      {online ? <Wifi size={16} /> : <WifiOff size={16} />}
      <strong>{online ? "Back Online" : "Offline Mode"}</strong>
      <span>
        {online
          ? "Your connection has been restored."
          : "Your local workspace is available. AI requires internet."}
      </span>
    </div>
  );
}
