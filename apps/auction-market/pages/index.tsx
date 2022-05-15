import { useIsMounted } from '@sushiswap/hooks'
import { Account, Wallet } from '@sushiswap/wallet-connector'
import Link from 'next/link'
import { useAccount, useConnect, useNetwork } from 'wagmi'

export default function Index() {
  const { data } = useAccount()
  const { isConnected, isReconnecting, isConnecting } = useConnect()
  const isMounted = useIsMounted()
  const { activeChain } = useNetwork()
  return (
    <div className="h-full">
      <h1 className="py-4 text-2xl font-bold">Overview</h1>
      {isMounted && !isConnected && !isReconnecting && !isConnecting && (
        <div className="flex space-x-4">
          <Wallet.List />
        </div>
      )}
      {isMounted && (isConnected || isReconnecting) && (
        <>
          <div>
            <Account.Name address={data?.address} />
            <Account.Disconnect className="ml-4" />
          </div>
          <Link href={`/auctions?chainId=${activeChain?.id}`}>[Auctions]</Link>
        </>
      )}
    </div>
  )
}
