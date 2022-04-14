import { FC, useMemo } from 'react'
import { getBuiltGraphSDK } from '../../.graphclient'
import Layout from '../../components/Layout'
import { Auction } from '../../features/context/Auction'
import { Bid } from '../../features/context/Bid'
import { AuctionRepresentation, BidRepresentation } from '../../features/context/representations'

interface Props {
  auctionRepresentation: AuctionRepresentation
  bidRepresentations: BidRepresentation[]
}

const ActionPage: FC<Props> = ({ auctionRepresentation, bidRepresentations }) => {
  //   let { auction, bids } = props
  const auction = useMemo(() => new Auction({ auction: auctionRepresentation }), [auctionRepresentation])
  const bids = useMemo(() => bidRepresentations.map((bid) => new Bid({ bid })), [bidRepresentations])
  console.log(bids)
  return (
    <Layout>
      <div>
        <h2>Auction</h2>
        {auction ? (
          <div key={auction.id}>
            {auction.status} {``}
            {auction.amount.toString()} {` SUSHI `}
            {auction.leadingBid.amount.toString()} {auction.token?.symbol}
            {auction.startTime.toLocaleDateString()} {``}
            {auction.endTime?.toLocaleDateString()} {``}
          </div>
        ) : (
          'No auction found'
        )}
      </div>
      <div>
        <h2>Bids</h2>
        {bids.length ? (
          bids.map((bid) => (
            <div key={bid.id}>
              {bid.amount.toString()} {``}
              {bid.timestamp.toLocaleString()} {``}
              {bid.user?.id} {``}
            </div>
          ))
        ) : (
          <div>
            <i>No bids found..</i>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ActionPage

export async function getServerSideProps({ query }) {
  const sdk = await getBuiltGraphSDK()
  const auctionRepresentation = (await sdk.Auction({ id: query.id })).auction
  const bidRepresentations = (await sdk.Bids({ auctionId: query.id })).auction.bids
  return {
    props: {
      auctionRepresentation,
      bidRepresentations,
    },
  }
}
