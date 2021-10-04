import { gql } from '@apollo/client'

export const SUMMARY_VIEW_QUERY = gql`
    query SummaryView($expiry: Int, $optionType: OptionType, $baseAsset: String, $quoteAsset: String){
        options(where:{
            expiry:$expiry,
            optionType:$optionType,
            baseAsset:$baseAsset,
            quoteAsset:$quoteAsset
        }){
            name
            strike
            id
            lastPrice
            sellOrders(where:{tradable:true}, orderBy:pricePerContract, orderDirection:asc, first:1){
                pricePerContract
            }
            buyOrders(where:{tradable:true}, orderBy:pricePerContract, orderDirection:desc, first:1){
                pricePerContract
            }
        }
    }
`

export const TOKEN_DATA_QUERY = gql`
    query TokenData{
        tokens{
            id
            symbol
            name
            decimals
        }
    }
`

export const ORDER_HISTORY_QUERY = gql`
    query UserHistory($id: ID){
        user(id:$id){
            id
            userOptions(orderBy:nonce,orderDirection:desc){
                option{
                    baseAsset{symbol}
                    quoteAsset{symbol}
                    expiry
                    strike
                    optionType
                    lastPrice
                }
                buyOrders(orderBy:nonce,orderDirection:desc){
                    pricePerContract
                    size
                    tradable
                    fullyMatched
                    matches{size}
                    funded
                    expiredNonce
                    offerExpire
                    timestamp
                }
                sellOrders(orderBy:nonce,orderDirection:desc){
                    pricePerContract
                    size
                    tradable
                    fullyMatched
                    matches{size}
                    funded
                    expiredNonce
                    offerExpire
                    timestamp
                }
            }
        }
    }
`

export const SHRUBFOLIO_QUERY = gql`
    query Shrubfolio($id: ID){
        user(id:$id){
            id
            tokenBalances{
                token{symbol}
                unlockedBalance
                lockedBalance
                block
            }
            userOptions{
                balance
                option{
                    baseAsset{symbol}
                    quoteAsset{symbol}
                    expiry
                    strike
                    optionType
                    lastPrice
                }
                buyOrders(where:{fullyMatched:true}){
                    pricePerContract
                    size
                }
                sellOrders(where:{fullyMatched:true}){
                    pricePerContract
                    size
                }
            }
        }
    }
`

export const ORDER_BOOK_QUERY = gql`
    query OrderBook($id: ID){
        option(id:$id){
            baseAsset{symbol}
            quoteAsset{symbol}
            strike
            expiry
            optionType
            lastPrice
            buyOrders{
                size
                nonce
                pricePerContract
                expiredNonce
                funded
                offerExpire
                fee
                block
                timestamp
                fullyMatched
                matches{id}
            }
            sellOrders{
                id
                size
                nonce
                pricePerContract
                expiredNonce
                funded
                offerExpire
                fee
                block
                timestamp
                fullyMatched
                matches{id}
            }
        }
    }
`

export const META_QUERY = gql`
    {
        _meta{
            hasIndexingErrors
            block{
                hash
                number
            }
        }
    }
`
