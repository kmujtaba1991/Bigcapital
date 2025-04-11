// @ts-nocheck
import React from 'react';
import { Button } from '@blueprintjs/core';
import { TaxRatesSelect } from '@/components';

/**
 * A wrapper for TaxRatesSelect that makes it work like BranchSelect in the form.
 * @param {*} param0
 * @returns {JSX.Element}
 */
export function TaxRateSelect({ taxRates, ...rest }) {
  return <TaxRatesSelect {...rest} items={taxRates} />;
}

/**
 * Tax rate select button component.
 * @param {*} param0
 * @returns {JSX.Element}
 */
export function TaxRateSelectButton({ label, ...rest }) {
  return <Button text={label || 'Select Tax Rate'} {...rest} />;
}