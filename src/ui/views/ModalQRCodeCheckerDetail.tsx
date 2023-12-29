import React, { useEffect, useRef } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Modal } from 'ui/component';
import styled from 'styled-components';

const ModalWrapper = styled(Modal)`
  position: relative;
  color: var(--r-neutral-foot);
  font-size: 14px;
  padding-top: 4px;

  &::before {
    display: none;
  }
`;

const ModalQRCodeCheckerDetail = ({
  visible,
  data,
  okText = 'Try Again',
  cancelText = 'Cancel',
  onOk,
  onCancel,
}: {
  visible: boolean;
  data: string;
  okText?: string;
  cancelText?: string;
  onOk(): void;
  onCancel(): void;
}) => {
  const { t } = useTranslation();

  return (
    <ModalWrapper
      title={'Error'}
      centered
      className="modal-support-darkmode"
      visible={visible}
      destroyOnClose
      onClose={onCancel}
    >
      <div className="signature-qr-checker-detail">
        <div className="container">{data}</div>
        <div className="footer">
          <div className="buttons gap-[18px]">
            <Button type="primary" ghost onClick={onCancel}>
              {cancelText}
            </Button>
            <Button type="primary" onClick={onOk}>
              {okText}
            </Button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default ModalQRCodeCheckerDetail;
