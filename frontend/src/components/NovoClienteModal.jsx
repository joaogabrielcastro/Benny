import ClienteFormModal from "./ClienteFormModal";

const NovoClienteModal = ({ isOpen, onClose, onClienteCriado }) => (
  <ClienteFormModal
    isOpen={isOpen}
    onClose={onClose}
    clienteId={null}
    onSuccess={onClienteCriado}
  />
);

export default NovoClienteModal;
