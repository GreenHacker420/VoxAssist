import React from 'react';
import { Modal as AntModal } from 'antd';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  confirmLoading?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  footer,
  confirmLoading = false
}: ModalProps) {
  const widthMap = {
    sm: 400,
    md: 500,
    lg: 600,
    xl: 800
  };

  return (
    <AntModal
      title={title}
      open={isOpen}
      onCancel={onClose}
      footer={footer}
      width={widthMap[maxWidth]}
      confirmLoading={confirmLoading}
      destroyOnHidden
      centered
    >
      {children}
    </AntModal>
  );
}
