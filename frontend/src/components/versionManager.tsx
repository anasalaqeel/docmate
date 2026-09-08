import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import {
  ClockIcon,
  DocumentDuplicateIcon,
  ArrowUturnLeftIcon,
  StarIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  getDocVersions,
  createDocVersion,
  updateDocVersion,
  deleteDocVersion,
  forkDocVersion,
  type DocVersionSummary,
} from "../services/docsService";
import { EnhancedInput } from "./ui/enhancedInput";
import Switch from "./ui/Switch";

interface VersionManagerProps {
  docId: number;
  /** The documentation's own version label; used to pre-fill the first cut */
  currentLabel?: string;
  /** Called after content-affecting operations (fork) so the editor refreshes */
  onContentChanged: () => void;
}

const LABEL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/;

const VersionManager = ({ docId, currentLabel, onContentChanged }: VersionManagerProps) => {
  const [versions, setVersions] = useState<DocVersionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const cutModal = useDisclosure();
  const forkModal = useDisclosure();
  const deleteModal = useDisclosure();

  const [newLabel, setNewLabel] = useState("");
  const [newChangelog, setNewChangelog] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [cutError, setCutError] = useState<string | null>(null);

  const [forkTarget, setForkTarget] = useState<DocVersionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocVersionSummary | null>(null);

  const fetchVersions = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await getDocVersions(docId);
      if (response.success && response.data) {
        setVersions(response.data);
      } else {
        setLoadError(response.message || "Failed to load versions");
      }
    } catch {
      setLoadError("Failed to load versions");
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    setIsLoading(true);
    fetchVersions();
  }, [fetchVersions]);

  const releases = versions.filter((v) => !v.isBackup);
  const backups = versions.filter((v) => v.isBackup);
  const labelInvalid =
    !newLabel.trim() || !LABEL_PATTERN.test(newLabel.trim()) || newLabel.trim().toLowerCase() === "next";

  const openCutModal = () => {
    // First cut pre-fills with the doc's own label (typically "1.0.0") so the
    // versioning starts at v1; later cuts start from an empty field.
    setNewLabel(releases.length === 0 ? currentLabel?.trim() || "1.0.0" : "");
    setNewChangelog("");
    // Pre-check "set as default" when no default exists yet: the first cut
    // usually becomes the version readers should see.
    setNewIsDefault(!releases.some((v) => v.isDefault));
    setCutError(null);
    cutModal.onOpen();
  };

  const handleCut = async () => {
    if (labelInvalid) return;
    setIsCreating(true);
    setCutError(null);
    try {
      const response = await createDocVersion(docId, {
        version: newLabel.trim(),
        changelog: newChangelog.trim() || undefined,
        isDefault: newIsDefault,
      });
      if (response.success) {
        cutModal.onClose();
        await fetchVersions();
        onContentChanged();
      } else {
        setCutError(response.message || "Failed to create version");
      }
    } catch {
      setCutError("Failed to create version");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetDefault = async (version: DocVersionSummary, isDefault: boolean) => {
    if (!version.id) return;
    setBusyId(version.id);
    setActionError(null);
    try {
      const response = await updateDocVersion(docId, version.id, { isDefault });
      if (response.success) {
        await fetchVersions();
        onContentChanged();
      } else {
        setActionError(response.message || "Failed to update version");
      }
    } catch {
      setActionError("Failed to update version");
    } finally {
      setBusyId(null);
    }
  };

  const handleFork = async () => {
    if (!forkTarget?.id) return;
    setBusyId(forkTarget.id);
    setActionError(null);
    try {
      const response = await forkDocVersion(docId, forkTarget.id);
      if (response.success) {
        forkModal.onClose();
        await fetchVersions();
        onContentChanged();
      } else {
        setActionError(response.message || "Failed to restore version");
      }
    } catch {
      setActionError("Failed to restore version");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      const response = await deleteDocVersion(docId, deleteTarget.id);
      if (response.success) {
        deleteModal.onClose();
        await fetchVersions();
      } else {
        setActionError(response.message || "Failed to delete version");
      }
    } catch {
      setActionError("Failed to delete version");
    } finally {
      setBusyId(null);
    }
  };

  const renderVersionRow = (version: DocVersionSummary) => (
    <div
      key={version.id}
      className="flex flex-wrap items-center gap-3 py-3 border-b border-[var(--docmate-border-color)] last:border-b-0"
    >
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="font-semibold">v{version.version}</span>
        {version.isDefault && (
          <Chip color="success" variant="flat" size="sm" className="font-medium">
            Stable
          </Chip>
        )}
        {version.isBackup && (
          <Chip variant="flat" size="sm" className="font-medium">
            Backup
          </Chip>
        )}
      </div>
      <div className="flex-1 min-w-[220px]">
        {version.changelog ? (
          <p className="text-sm">{version.changelog}</p>
        ) : (
          <p className="text-sm text-[var(--docmate-text-secondary)]">No changelog</p>
        )}
        <p className="text-xs text-[var(--docmate-text-secondary)]">
          {version.createdAt ? new Date(version.createdAt).toLocaleString() : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!version.isBackup && (
          <Button
            size="sm"
            variant="flat"
            startContent={<StarIcon className="w-4 h-4" />}
            isDisabled={busyId === version.id}
            onPress={() => handleSetDefault(version, !version.isDefault)}
          >
            {version.isDefault ? "Clear default" : "Set as default"}
          </Button>
        )}
        <Button
          size="sm"
          variant="flat"
          startContent={<ArrowUturnLeftIcon className="w-4 h-4" />}
          isDisabled={busyId === version.id}
          onPress={() => {
            setForkTarget(version);
            forkModal.onOpen();
          }}
        >
          Edit this version
        </Button>
        <Button
          size="sm"
          variant="flat"
          color="danger"
          isIconOnly
          aria-label={`Delete version ${version.version}`}
          isDisabled={busyId === version.id}
          onPress={() => {
            setDeleteTarget(version);
            deleteModal.onOpen();
          }}
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" label="Loading versions..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Versions</h3>
              </div>
              <p className="text-sm text-[var(--docmate-text-secondary)]">
                Cutting a version freezes the current content — structure, pages and API spec —
                into an immutable snapshot. Flag one version as <strong>stable</strong> and readers
                get it at the plain doc URL, while you keep editing the live draft. To change an
                older version, use <strong>Edit this version</strong>: it copies the snapshot back
                over the live draft (backing up your current draft first), you edit, then cut a
                new version.
              </p>
            </div>
            <Button
              color="primary"
              onPress={openCutModal}
              startContent={<PlusIcon className="w-4 h-4" />}
              className="font-medium"
            >
              Cut version
            </Button>
          </div>

          {actionError && (
            <p className="text-sm text-danger" role="alert">
              {actionError}
            </p>
          )}

          {loadError ? (
            <p className="text-sm text-danger">{loadError}</p>
          ) : releases.length === 0 ? (
            <p className="text-sm text-[var(--docmate-text-secondary)]">
              No versions yet — the public doc URL serves the live content you are editing.
            </p>
          ) : (
            <div>{releases.map(renderVersionRow)}</div>
          )}
        </CardBody>
      </Card>

      {backups.length > 0 && (
        <Card>
          <CardBody className="space-y-2 p-6">
            <div className="flex items-center gap-2 mb-2">
              <DocumentDuplicateIcon className="w-5 h-5 text-[var(--docmate-text-secondary)]" />
              <h3 className="text-lg font-semibold">Automatic backups</h3>
            </div>
            <p className="text-sm text-[var(--docmate-text-secondary)] mb-2">
              Created automatically before ingestion or a version restore replaces the content.
              The newest five are kept.
            </p>
            {backups.map(renderVersionRow)}
          </CardBody>
        </Card>
      )}

      {/* Cut version modal */}
      <Modal
        isOpen={cutModal.isOpen}
        onClose={cutModal.onClose}
        size="lg"
        backdrop="blur"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex-col gap-1 pb-4">
                <h3 className="text-lg font-semibold">Cut a new version</h3>
                <p className="text-sm font-normal text-[var(--docmate-text-secondary)]">
                  Freezes the current live content under a label like 2.0.0
                </p>
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="flex flex-col gap-6">
                  <EnhancedInput
                    label="Version label"
                    labelPlacement="outside"
                    placeholder="e.g. 2.0.0"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    variant="bordered"
                    isInvalid={newLabel.length > 0 && labelInvalid}
                    errorMessage="Letters, digits, '.', '_' and '-' only (max 50); 'next' is reserved"
                    classNames={{
                      inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                      input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                      label: "text-[var(--docmate-text)]",
                    }}
                  />
                  <Textarea
                    label="Changelog (optional)"
                    labelPlacement="outside"
                    placeholder="What changed in this version?"
                    value={newChangelog}
                    onValueChange={setNewChangelog}
                    variant="bordered"
                    minRows={3}
                    classNames={{
                      inputWrapper: "border-[var(--docmate-border-color)] bg-[var(--docmate-surface-alt)]",
                      input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                      label: "text-[var(--docmate-text)]",
                    }}
                  />
                  <Switch
                    isSelected={newIsDefault}
                    onValueChange={setNewIsDefault}
                    size="sm"
                    color="primary"
                  >
                    Set as stable default (readers get this version at the plain doc URL)
                  </Switch>
                  {cutError && (
                    <p className="text-sm text-danger" role="alert">
                      {cutError}
                    </p>
                  )}
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-divider pt-4">
                <Button variant="flat" onPress={onClose} className="font-medium">
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCut}
                  isDisabled={labelInvalid}
                  isLoading={isCreating}
                  className="font-medium"
                >
                  Cut version
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Fork confirm modal */}
      <Modal
        isOpen={forkModal.isOpen}
        onClose={forkModal.onClose}
        size="md"
        backdrop="blur"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex-col gap-1 pb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-warning" />
                  Edit v{forkTarget?.version}?
                </h3>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm">
                  This replaces the current live draft (structure, pages and API spec) with the v
                  {forkTarget?.version} snapshot — your current draft is saved as an automatic
                  backup first, and pages added after this version was cut are removed. The
                  version readers see is not affected until you cut a new version when done.
                </p>
              </ModalBody>
              <ModalFooter className="border-t border-divider pt-4">
                <Button variant="flat" onPress={onClose} className="font-medium">
                  Cancel
                </Button>
                <Button color="warning" onPress={handleFork} isLoading={busyId === forkTarget?.id} className="font-medium">
                  Edit this version
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.onClose}
        size="md"
        backdrop="blur"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex-col gap-1 pb-4">
                <h3 className="text-lg font-semibold">Delete v{deleteTarget?.version}?</h3>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm">
                  This permanently removes the snapshot. The live content is not affected.{" "}
                  {deleteTarget?.isDefault
                    ? "It is currently the stable default — after deletion the plain doc URL will serve the live content."
                    : ""}
                </p>
              </ModalBody>
              <ModalFooter className="border-t border-divider pt-4">
                <Button variant="flat" onPress={onClose} className="font-medium">
                  Cancel
                </Button>
                <Button color="danger" onPress={handleDelete} isLoading={busyId === deleteTarget?.id} className="font-medium">
                  Delete version
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default VersionManager;
