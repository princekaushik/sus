import { Signature } from '@ethersproject/bytes'
import { BENTOBOX_ADDRESS } from '@sushiswap/core-sdk'
import { tryParseAmount } from '@sushiswap/currency'
import { Fraction, JSBI, ZERO } from '@sushiswap/math'
import { Button, Dots, Form } from '@sushiswap/ui'
import { Approve } from '@sushiswap/wagmi/systems'
import { createToast } from 'components'
import { approveBentoBoxAction, batchAction, vestingCreationAction } from 'features/actions'
import { CreateVestingFormDataTransformed } from 'features/vesting/CreateForm/types'
import { logTenderlyUrl } from 'functions/getTenderly'
import { useFuroVestingContract } from 'hooks'
import { FundSource } from 'hooks/useFundSourceToggler'
import { FC, useCallback, useMemo, useState } from 'react'
import { useAccount, useNetwork, useSendTransaction } from 'wagmi'

interface CreateFormButtons {
  onDismiss(): void
  formData: CreateVestingFormDataTransformed
}

const CreateFormButtons: FC<CreateFormButtons> = ({
  onDismiss,
  formData: {
    token,
    startDate,
    stepAmount,
    fundSource,
    recipient,
    cliffAmount,
    cliffDuration,
    stepPayouts,
    stepConfig,
  },
}) => {
  const { data: account } = useAccount()
  const { activeChain } = useNetwork()
  const [signature, setSignature] = useState<Signature>()

  const contract = useFuroVestingContract()
  const { sendTransactionAsync, isLoading: isWritePending } = useSendTransaction()

  const [totalAmountAsEntity, stepPercentage] = useMemo(() => {
    if (!token || !stepPayouts) return [undefined, undefined]

    const cliff = tryParseAmount(cliffAmount?.toString(), token)
    const step = tryParseAmount(stepAmount.toString(), token)
    const totalStep = tryParseAmount(stepAmount.toString(), token)?.multiply(JSBI.BigInt(stepPayouts))
    const totalAmount = cliff && totalStep ? cliff.add(totalStep) : undefined

    return [
      totalAmount,
      totalAmount?.greaterThan(ZERO) && step
        ? new Fraction(step.multiply(JSBI.BigInt(1e18)).quotient, totalAmount.quotient).quotient
        : JSBI.BigInt(0),
    ]
  }, [cliffAmount, stepAmount, stepPayouts, token])

  const createVesting = useCallback(async () => {
    if (!contract || !account?.address) return
    if (!recipient || !token || !startDate || !cliffDuration || !stepConfig?.time || !stepPercentage) {
      return
    }

    const actions = [
      approveBentoBoxAction({ contract, user: account.address, signature }),
      vestingCreationAction({
        contract,
        recipient,
        token,
        startDate: new Date(startDate),
        cliffDuration: cliffDuration.toString(),
        stepDuration: stepConfig?.time.toString(),
        steps: stepPayouts.toString(),
        stepPercentage: stepPercentage.toString(),
        amount: totalAmountAsEntity ? totalAmountAsEntity.quotient.toString() : JSBI.from('0').toString(),
        fromBentobox: fundSource === FundSource.BENTOBOX,
      }),
    ]

    try {
      const data = await sendTransactionAsync({
        request: {
          from: account.address,
          to: contract.address,
          data: batchAction({ contract, actions }),
        },
      })

      onDismiss()

      createToast({
        title: 'Create vesting',
        description: `You have successfully created a vested stream`,
        promise: data.wait(),
      })
    } catch (e: any) {
      logTenderlyUrl({
        chainId: activeChain?.id,
        from: account.address,
        to: contract.address,
        data: batchAction({ contract, actions }),
      })
    }
  }, [
    account?.address,
    activeChain?.id,
    cliffDuration,
    contract,
    fundSource,
    onDismiss,
    recipient,
    sendTransactionAsync,
    signature,
    startDate,
    stepConfig?.time,
    stepPayouts,
    stepPercentage,
    token,
    totalAmountAsEntity,
  ])

  return (
    <Form.Buttons>
      <Approve
        components={
          <Approve.Components>
            <Approve.Bentobox watch token={token} address={contract?.address} onSignature={setSignature} />
            <Approve.Token
              watch
              amount={totalAmountAsEntity}
              address={activeChain ? BENTOBOX_ADDRESS[activeChain?.id] : undefined}
            />
          </Approve.Components>
        }
        render={({ approved }) => (
          <Button
            variant="filled"
            color="gradient"
            disabled={isWritePending || !approved || !totalAmountAsEntity?.greaterThan(ZERO)}
            onClick={createVesting}
          >
            {isWritePending ? <Dots>Confirm transaction</Dots> : 'Create vesting'}
          </Button>
        )}
      />
    </Form.Buttons>
  )
}

export default CreateFormButtons
