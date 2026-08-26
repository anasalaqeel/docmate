import { useState, useEffect, useCallback, useOptimistic } from 'react';
import {
  Card,
  CardBody,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner
} from '@heroui/react';
import { PlusIcon, EllipsisVerticalIcon, PencilIcon, GlobeAltIcon, TrashIcon, DocumentTextIcon, CodeBracketIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useNavigate, useSearchParams } from 'react-router';
import { useLayout } from '../../hooks/useLayout';
import { AdminSidebar } from '../../components/Sidebar/AdminSidebar';
import docsService from '../../services/docsService';
import type { Documentation } from '../../services/docsService';
import DocumentationTypeSelector from '../../components/documentationTypeSelector';
import ImportButton from '../../components/ImportButton';
import type { DocumentationType } from '../../types/docs';
import styles from '../../styles/docsListPage.module.css';
import PageHeader from '../../components/PageHeader';
import { useExport } from '../../hooks/useExport';

const DocsListPage = () => {
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Documentation | null>(null);
  const { setLayoutData, resetLayoutData } = useLayout();

  useEffect(() => {
    setLayoutData({
      headerTitle: "Documentation Builder",
      navbarType: "admin",
      sidebar: <AdminSidebar />,
      showAdminButton: false,
    });
    return () => resetLayoutData();
  }, [setLayoutData, resetLayoutData]);

  // Optimistic state for docs list
  const [optimisticDocs, addOptimisticDoc] = useOptimistic(
    docs,
    (_state, newDocs: Documentation[]) => newDocs
  );
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    version: '1.0.0',
    isPublic: false,
    type: 'mixed' as DocumentationType,
    baseUrl: ''
  });
  const { handleExport } = useExport();

  const fetchDocs = async () => {
    try {
      setIsLoading(true);
      const response = await docsService.getAllDocs();
      
      if (response.success && response.data) {
        setDocs(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch documentations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = useCallback(() => {
    setSelectedDoc(null);
    setFormData({
      title: '',
      description: '',
      version: '1.0.0',
      isPublic: false,
      type: 'mixed' as DocumentationType,
      baseUrl: ''
    });
    onOpen();
  }, [onOpen]);

  useEffect(() => {
    fetchDocs();

    // Check if we should auto-open the create modal
    const action = searchParams.get('action');
    if (action === 'create') {
      openCreateModal();
      // Remove the parameter from URL
      setSearchParams({});
    }
  }, [searchParams, openCreateModal, setSearchParams]);

  const handleCreate = async () => {
    console.log('Creating documentation with form data:', formData);
    console.log('Selected doc:', selectedDoc);

    // Update operation - handle separately
    if (selectedDoc) {
      // Optimistic update for edit
      const updatedDocs = docs.map(doc =>
        doc.id === selectedDoc.id ? { ...doc, ...formData } : doc
      );
      addOptimisticDoc(updatedDocs);

      try {
        const response = await docsService.updateDoc(selectedDoc.id!, formData);
        console.log('Response from server:', response);

        if (response.success && response.data) {
          // Replace with real data from server
          setDocs(prev => prev.map(doc =>
            doc.id === selectedDoc.id ? response.data! : doc
          ));
          console.log('Documentation updated successfully');
          onClose();
          setSelectedDoc(null);
          setFormData({
            title: '',
            description: '',
            version: '1.0.0',
            isPublic: false,
            type: 'mixed' as DocumentationType,
            baseUrl: ''
          });
        } else {
          console.error('Server returned error:', response.message);
          // useOptimistic automatically reverts
        }
      } catch (error) {
        console.error('Failed to update documentation:', error);
        // useOptimistic automatically reverts
      }
      return;
    }

    // Create operation - optimistic update
    const tempId = Date.now();
    const optimisticDoc: Documentation = {
      id: tempId,
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addOptimisticDoc([...docs, optimisticDoc]);

    try {
      const response = await docsService.createDoc(formData);
      console.log('Response from server:', response);

      if (response.success && response.data) {
        // Update with real data
        setDocs(prev => [...prev, response.data!]);
        console.log('Documentation created successfully');
        onClose();
        setFormData({
          title: '',
          description: '',
          version: '1.0.0',
          isPublic: false,
          type: 'mixed' as DocumentationType,
          baseUrl: ''
        });
      } else {
        console.error('Server returned error:', response.message);
        // useOptimistic automatically reverts
      }
    } catch (error) {
      console.error('Failed to create documentation:', error);
      // useOptimistic automatically reverts
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    // Optimistic removal
    const filteredDocs = docs.filter(doc => doc.id !== selectedDoc.id);
    addOptimisticDoc(filteredDocs);

    try {
      const response = await docsService.deleteDoc(selectedDoc.id!);

      if (response.success) {
        console.log('Documentation deleted successfully');
        // Update the source of truth
        setDocs(filteredDocs);
        onDeleteClose();
        setSelectedDoc(null);
      } else {
        console.error('Server returned error:', response.message);
        // useOptimistic automatically reverts
      }
    } catch (error) {
      console.error('Failed to delete documentation:', error);
      // useOptimistic automatically reverts
    }
  };

  const handleImportSuccess = (document: Documentation) => {
    console.log("handleImportSuccess called!", { document });
    if (!document || !document.id) {
      console.warn("handleImportSuccess: received invalid document payload, fetching docs...");
      fetchDocs();
      return;
    }
    // Update source of truth state so it persists across renders
    setDocs((prevDocs) => [...prevDocs, document]);
  };


  const openEditModal = (doc: Documentation) => {
    setSelectedDoc(doc);
    setFormData({
      title: doc.title || '',
      description: doc.description || '',
      version: doc.version || '1.0.0',
      isPublic: doc.isPublic ?? false,
      type: doc.type || 'mixed' as DocumentationType,
      baseUrl: doc.baseUrl || ''
    });
    onOpen();
  };

  const openDeleteModal = (doc: Documentation) => {
    setSelectedDoc(doc);
    onDeleteOpen();
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Loading documentations..." />
      </div>
    );
  }

  return (
    <div className={`${styles.container} container mx-auto px-4`}>
      <Card className="border-none" style={{ background: 'var(--docmate-surface)', borderRadius: '16px', boxShadow: 'var(--docmate-card-shadow)' }}>
        <PageHeader 
          title="Documentation Builder"
          subtitle="Manage your API documentations"
          actions={
            <>
              <ImportButton
                onImportSuccess={handleImportSuccess}
                size="md"
                variant="flat"
                className="bg-[var(--docmate-surface-alt)] border-1 border-[var(--docmate-border-color)] text-[var(--docmate-text)] hover:bg-[var(--docmate-border-color)] transition-all"
              />
              <Button
                onPress={openCreateModal}
                className={styles.buttonPrimary}
                startContent={<PlusIcon className="w-4 h-4" />}
              >
                Create Documentation
              </Button>
            </>
          }
        />

        <CardBody>
          {optimisticDocs.length === 0 ? (
            <div className={styles.empty}>
              <h3>No documentations found</h3>
              <p>Create your first documentation to get started</p>
              <div className="flex gap-2 justify-center">
                <ImportButton
                  onImportSuccess={handleImportSuccess}
                  className="shadow-lg hover:shadow-xl transition-all duration-200"
                />
                <Button
                  color="primary"
                  onPress={openCreateModal}
                  className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                  startContent={<PlusIcon className="w-4 h-4" />}
                >
                  Create Documentation
                </Button>
              </div>
            </div>
          ) : (
            <Table aria-label="Documentations table" removeWrapper>
              <TableHeader>
                <TableColumn className="bg-transparent border-b border-[var(--docmate-border-color)]">Title</TableColumn>
                <TableColumn className="bg-transparent border-b border-[var(--docmate-border-color)]">Version</TableColumn>
                <TableColumn className="bg-transparent border-b border-[var(--docmate-border-color)]">Status</TableColumn>
                <TableColumn className="bg-transparent border-b border-[var(--docmate-border-color)]">Created By</TableColumn>
                <TableColumn className="bg-transparent border-b border-[var(--docmate-border-color)]">Updated</TableColumn>
                <TableColumn className="bg-transparent border-b border-[var(--docmate-border-color)]" align="center">Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {optimisticDocs.map((doc) => (
                  <TableRow key={doc.id} className="border-b border-[var(--docmate-border-color)]/50 last:border-0 hover:bg-[var(--docmate-surface-alt)]/30 transition-colors">
                    <TableCell>
                      <div className="py-1">
                        <p className="font-semibold text-[var(--docmate-text)]">{doc.title}</p>
                        {doc.description && (
                          <p className="text-sm line-clamp-1" style={{ color: 'var(--docmate-text-secondary)' }}>{doc.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="sm" 
                        variant="flat"
                        style={{ 
                          background: 'color-mix(in srgb, var(--docmate-primary), transparent 90%)', 
                          color: 'var(--docmate-primary)',
                          border: '1px solid color-mix(in srgb, var(--docmate-primary), transparent 80%)'
                        }}
                      >
                        {doc.version}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        style={{ 
                          background: doc.isPublic 
                            ? 'color-mix(in srgb, var(--docmate-success), transparent 90%)' 
                            : 'color-mix(in srgb, var(--docmate-text-secondary), transparent 90%)',
                          color: doc.isPublic ? 'var(--docmate-success)' : 'var(--docmate-text-secondary)',
                          border: `1px solid color-mix(in srgb, ${doc.isPublic ? 'var(--docmate-success)' : 'var(--docmate-text-secondary)'}, transparent 80%)`
                        }}
                        size="sm"
                        variant="flat"
                      >
                        {doc.isPublic ? 'Public' : 'Private'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[var(--docmate-text)]">{doc.creator?.name || 'Unknown'}</p>
                        <p className="text-xs" style={{ color: 'var(--docmate-text-secondary)' }}>{doc.creator?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--docmate-text-secondary)]">
                      {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          className="text-[var(--docmate-primary)] hover:bg-[color-mix(in srgb,var(--docmate-primary),transparent_90%)]"
                          onPress={() => navigate(`/admin/docs/edit/${doc.id}`)}
                          title="Edit Document"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Dropdown
                          backdrop="blur"
                          classNames={{
                            content: "bg-[var(--docmate-surface)] border-1 border-[var(--docmate-border-color)] shadow-xl min-w-[200px]"
                          }}
                        >
                          <DropdownTrigger>
                            <Button 
                              size="sm" 
                              variant="light" 
                              isIconOnly
                              className="text-[var(--docmate-text-secondary)] hover:bg-[var(--docmate-surface-alt)]"
                            >
                              <EllipsisVerticalIcon className="w-5 h-5" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu 
                            aria-label="Actions"
                            itemClasses={{
                              base: "gap-3 px-3 py-2 text-[var(--docmate-text)] hover:bg-[var(--docmate-surface-alt)] data-[hover=true]:bg-[var(--docmate-surface-alt)] rounded-lg transition-colors",
                              title: "font-medium",
                              description: "text-xs text-[var(--docmate-text-secondary)]"
                            }}
                          >
                            <DropdownItem 
                              key="edit" 
                              startContent={<PencilIcon className="w-4 h-4" />}
                              onPress={() => openEditModal(doc)}
                            >
                              Edit Details
                            </DropdownItem>
                            <DropdownItem 
                              key="view" 
                              startContent={<GlobeAltIcon className="w-4 h-4" />}
                              onPress={() => navigate(`/docs/${doc.id}`)}
                            >
                              View Public
                            </DropdownItem>
                            
                            <DropdownItem
                              key="export-pdf"
                              startContent={<DocumentTextIcon className="w-4 h-4" />}
                              description="Download as PDF"
                              onPress={() => handleExport(doc.id!, doc.title, 'pdf')}
                            >
                              Export PDF
                            </DropdownItem>
                            <DropdownItem
                              key="export-markdown"
                              startContent={<CodeBracketIcon className="w-4 h-4" />}
                              description="Download as Markdown"
                              onPress={() => handleExport(doc.id!, doc.title, 'markdown')}
                            >
                              Export Markdown
                            </DropdownItem>
                            <DropdownItem
                              key="export-json"
                              startContent={<ArchiveBoxIcon className="w-4 h-4" />}
                              description="Download as JSON"
                              onPress={() => handleExport(doc.id!, doc.title, 'json')}
                              showDivider
                            >
                              Export JSON
                            </DropdownItem>

                            <DropdownItem
                              key="delete"
                              className="text-[var(--docmate-error)] hover:bg-[color-mix(in srgb,var(--docmate-error),transparent_90%)] data-[hover=true]:bg-[color-mix(in srgb,var(--docmate-error),transparent_90%)] data-[hover=true]:text-[var(--docmate-error)]"
                              startContent={<TrashIcon className="w-4 h-4" />}
                              onPress={() => openDeleteModal(doc)}
                            >
                              Delete
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="3xl"
        scrollBehavior="inside"
        backdrop="blur"
        placement="center"
        classNames={{
          base: "max-h-[85vh] bg-[var(--docmate-surface)] border-1 border-[var(--docmate-border-color)] shadow-2xl rounded-2xl",
          header: "border-b-1 border-[var(--docmate-border-color)] px-6 py-4 text-[var(--docmate-text)]",
          body: "px-6 py-4 overflow-y-auto",
          footer: "border-t-1 border-[var(--docmate-border-color)] px-6 py-4",
          closeButton: "hover:bg-[var(--docmate-surface-alt)] transition-colors"
        }}
      >
        <ModalContent>
          <ModalHeader>
            {selectedDoc ? 'Edit Documentation' : 'Create Documentation'}
          </ModalHeader>
          <ModalBody>
            <DocumentationTypeSelector
              documentation={{
                title: formData.title,
                description: formData.description,
                version: formData.version,
                isPublic: formData.isPublic,
                type: formData.type,
                baseUrl: formData.baseUrl
              } as Documentation}
              onUpdate={(updates) => setFormData(prev => ({ ...prev, ...updates as Partial<typeof formData> }))}
              isEditing={!!selectedDoc}
              isModal={true}
            />
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={onClose}
              className="text-[var(--docmate-text-secondary)] font-medium"
            >
              Cancel
            </Button>
            <Button 
              onPress={handleCreate}
              className={styles.buttonPrimary + " px-8"}
            >
              {selectedDoc ? 'Update Documentation' : 'Create Documentation'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal 
        isOpen={isDeleteOpen} 
        onClose={onDeleteClose}
        backdrop="blur"
        placement="center"
        classNames={{
          base: "bg-[var(--docmate-surface)] border-1 border-[var(--docmate-border-color)] shadow-2xl rounded-2xl p-2",
          header: "text-[var(--docmate-text)] pb-0 font-bold text-xl",
          footer: "pt-0"
        }}
      >
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody className="py-4">
            <p className="text-[var(--docmate-text)] text-base">
              Are you sure you want to delete <span className="font-bold text-[var(--docmate-primary)]">"{selectedDoc?.title}"</span>?
            </p>
            <p className="text-sm font-medium text-[var(--docmate-error)]/80 bg-[var(--docmate-error)]/5 p-3 rounded-lg border-1 border-[var(--docmate-error)]/10">
              This action cannot be undone and will permanently remove all associated data.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={onDeleteClose} 
              className="text-[var(--docmate-text-secondary)] font-medium"
            >
              Keep it
            </Button>
            <Button 
              className={styles.buttonWarning + " px-8"}
              onPress={handleDelete}
            >
              Delete Permanently
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default DocsListPage;