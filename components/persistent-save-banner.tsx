/**
 * Kept as a compatibility shim for screens that still import it.
 * v0.7.0 intentionally removes the redundant middle save banner.
 * The compact header save action + the large bottom FormActionBar remain.
 */
type PersistentSaveBannerProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
};

export function PersistentSaveBanner(_props: PersistentSaveBannerProps) {
  return null;
}
