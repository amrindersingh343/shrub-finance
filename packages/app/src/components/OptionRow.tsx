import React, {useState} from "react";
import RadioCard from "./Radio";
import {FaEthereum} from "react-icons/fa";
import {getOrders, getSpecificOrderbook, postOrder} from "../utils/requests";

import {
  Box,
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Flex,
  FormLabel,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Spacer,
  Stack,
  Tag, TagLabel,
  Text, Tooltip,
  useDisclosure,
  useRadioGroup,
} from "@chakra-ui/react";

import {
  transformOrderApiApp,
  getAddressFromSignedOrder,
  getAvailableBalance,
  getUserNonce,
  matchOrder,
  orderWholeUnitsToBaseUnits,
  signOrder,
  toEthDate,
  validateOrderAddress, transformOrderAppChain, optionTypeToNumber, iOrderToPostOrder, formatExpiry
} from "../utils/ethMethods";
import {Icon} from "@chakra-ui/icons";
import {ApiOrder, AppCommon, GetOrdersParams, OptionAction, OptionType, UnsignedOrder} from '../types';
import {useWeb3React} from "@web3-react/core";
import {getEnumKeys} from '../utils/helperMethods';
import {BigNumber, ethers} from "ethers";
import useFetch from "../hooks/useFetch";
import {CgDollar, GiSwordBrandish, GiTakeMyMoney, MdDateRange} from "react-icons/all";

const height = 100;

// function PlaceOrder({ baseAsset, quoteAsset, strikePrice, isCall, isBuy, last, ask, bid, option, optionType, expiryDate }: any) {
function OptionRow({appCommon, isBuy, last, ask, bid}: {appCommon: AppCommon, isBuy: boolean, last: string, ask: string, bid: string}) {
  const { baseAsset, quoteAsset, expiry, optionType, strike, formattedExpiry, formattedStrike } = appCommon;

  const { isOpen: isOpenLimitBuy, onOpen: onOpenLimitBuy, onClose: onCloseLimitBuy } = useDisclosure();

  const { isOpen: isOpenMarketBuy, onOpen: onOpenMarketBuy, onClose: onCloseMarketBuy } = useDisclosure();


  const [amount, setAmount] = React.useState(1);
  const [price, setPrice] = React.useState('');

  // TODO: get proper status response from postOrder method to show loading state on Place Order button
  const [submitting, setSubmitting] = React.useState(false);

  // Radio logic
  const radioOptions = ['BUY', 'SELL']
  const radioOptionsType = ['CALL', 'PUT']
  const [radioOption, setRadioOption] = useState<'BUY' | 'SELL'>(isBuy ? 'BUY' : 'SELL');
  const [radioOptionType, setRadioOptionType] = useState(optionType);

  const url = `${process.env.REACT_APP_API_ENDPOINT}/orders`;
  const params: GetOrdersParams = {
    strike: strike.toString(),
    isBuy,
    quoteAsset,
    baseAsset,
    expiry: toEthDate(expiry),
    optionType: optionTypeToNumber(optionType)
  }
  const {data:orderBookData, status: orderBookDataStatus} = useFetch<ApiOrder[]>(url, {params});
  console.log(orderBookData);

  const {
    getRootProps: getOptionRootProps,
    getRadioProps: getOptionRadioProps,
  } = useRadioGroup({
    name: "option",
    defaultValue: isBuy ? 'BUY' : 'SELL',
    onChange: (nextValue: 'BUY' | 'SELL') => setRadioOption(nextValue),
  });

  const {
    getRootProps: getOptionTypeRootProps,
    getRadioProps: getOptionTypeRadioProps,
  } = useRadioGroup({
    name: "optionType",
    defaultValue: optionType,
    onChange: (nextValue: 'CALL' | 'PUT') => setRadioOptionType(nextValue),
  });

  const groupOption = getOptionRootProps();
  const groupOptionType = getOptionTypeRootProps();
  const { active, library, account } = useWeb3React();

  function closeLimitBuyModal() {
    setSubmitting(false);
    onCloseLimitBuy();
  }

  function closeMarketBuyModal() {
    setSubmitting(false);
    onCloseMarketBuy();
  }

  async function placeOrder() {
    setSubmitting(true);
    if (!active || !account) {
      console.error('Please connect your wallet');
      setSubmitting(false);
      return;
    }
    const now = new Date();
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setUTCDate(oneWeekFromNow.getUTCDate() + 7);
    const nonce =
      (await getUserNonce({
        address: account,
        quoteAsset,
        baseAsset,
      }, library)) + 1;
    const unsignedOrder: UnsignedOrder = {
      size: ethers.utils.parseUnits(amount.toString(), 18),
      isBuy: radioOption === 'BUY',
      optionType: optionTypeToNumber(radioOptionType),
      baseAsset,
      quoteAsset,
      expiry: toEthDate(expiry),
      strike,
      price: ethers.utils.parseUnits(price || '0', 18),
      fee: ethers.utils.parseUnits('0', 18),
      offerExpire: toEthDate(oneWeekFromNow),
      nonce,
    };
    try {
      // const wholeUnitOrder = orderWholeUnitsToBaseUnits(unsignedOrder);
      const signedOrder = await signOrder(unsignedOrder, library);
      const verifiedAddress = await getAddressFromSignedOrder(signedOrder, library);
      console.log(`verifiedAddress: ${verifiedAddress}`);
      const pOrder = iOrderToPostOrder(signedOrder);
      await postOrder(pOrder);
    } catch (e) {
      console.error(e);
    }
  }

  async function matchOrderNew() {
    // console.log('running matchOrderNew')
    // setSubmitting(true);
    // const orderbook = await getSpecificOrderbook({quoteAsset, baseAsset, expiry:expiryDate, optionType, strike, isBuy})
  }

  async function matchOrderRow() {
    // if (!active || !account) {
    //   console.error('Please connect your wallet');
    //   return;
    // }
    // const now = new Date();
    // const fifteenMinutesFromNow = new Date(now);
    // fifteenMinutesFromNow.setUTCMinutes(now.getUTCMinutes() + 15);
    // const order = await getOrders({});
    // console.log(order);
    // if (!order) {
    //   console.log("no orders found");
    //   return;
    // }
    // try {
    //   console.log(order);
    //   const formattedOrder = transformOrderApiApp(order);
    //   console.log(formattedOrder);
    //   const iOrder = transformOrderAppChain(formattedOrder);
    //   const doesAddressMatch: boolean = await validateOrderAddress(iOrder, library);
    //   console.log(doesAddressMatch);
    //   const {
    //     address,
    //     baseAsset,
    //     quoteAsset,
    //     nonce,
    //     price,
    //     optionType,
    //     strike,
    //     size,
    //     isBuy,
    //     expiry,
    //   } = formattedOrder;
    //   const userNonce = await getUserNonce({
    //     address,
    //     quoteAsset,
    //     baseAsset,
    //   }, library);
    //   console.log(userNonce);
    //   console.log(nonce);
    //   // if (userNonce !== nonce) {
    //   //   throw new Error("nonce does not match");
    //   // }
    //   if (optionType === OptionType.CALL) {
    //     // required collateral is strike * size of the quoteAsset
    //     const balance = await getAvailableBalance({
    //       address,
    //       tokenContractAddress: quoteAsset,
    //       provider: library
    //     });
    //     console.log(balance);
    //     console.log(size)
    //     if (balance.lt(size)) {
    //       throw new Error("not enough collateral of quoteAsset");
    //     }
    //   } else {
    //     // required collateral is strike * size of the baseAsset
    //     const balance = await getAvailableBalance({
    //       address,
    //       tokenContractAddress: baseAsset,
    //       provider: library
    //     });
    //     console.log(balance.toString());
    //     if (balance.lt(price)) {
    //       throw new Error("not enough collateral of baseAsset");
    //     }
    //   }
    //   // Get the user nonce
    //   const signerNonce =
    //     (await getUserNonce({
    //       address: account,
    //       quoteAsset,
    //       baseAsset,
    //     }, library)) + 1;
    //   console.log(`signerNonce: ${signerNonce}`);
    //   // Get other stuff needed for the order
    //   console.log(`isBuy: ${isBuy}`);
    //   console.log(`!isBuy: ${!isBuy}`);
    //   console.log(`optionType: ${optionType}`)
    //   const unsignedOrder = {
    //     size,
    //     isBuy: !isBuy,
    //     optionType: optionType === 'CALL' ? 1 : 0 as 0 | 1,
    //     baseAsset,
    //     quoteAsset,
    //     expiry: toEthDate(expiry),
    //     strike,
    //     price,
    //     fee: ethers.BigNumber.from(0),
    //     offerExpire: toEthDate(fifteenMinutesFromNow),
    //     nonce: signerNonce,
    //   };
    //   const signedOrder = await signOrder(unsignedOrder, library);
    //   console.log(signedOrder);
    //   const signedSellOrder = {
    //         ...transformOrderAppChain(formattedOrder),
    //       };
    //   const result = await matchOrder({
    //     signedBuyOrder: signedOrder,
    //     signedSellOrder
    //   }, library);
    //   console.log("result");
    //   console.log(result);
    //   // Create the buy order and sign it
    // } catch (e) {
    //   console.error(e);
    // }
  }


  return (
    <Box fontFamily="Montserrat">
      <Divider mb={5} />
      <Flex>
        <Box h={height}>
          <Text fontSize={"2xl"} pb={3}>
            ${formattedStrike}
          </Text>
          <Tag size={"sm"} colorScheme="teal">
            {optionType}
          </Tag>
        </Box>
        <Spacer/>
        <Box h={height} fontWeight="semibold" lineHeight={1.8}>
          <Text>Last: ${last}</Text>
          <Text>Ask: ${ask}</Text>
          <Text>Bid: ${bid}</Text>
        </Box>
        <Spacer/>
        <Box h={height}>
          <Stack spacing={4} direction="row" align="center">
            <Button colorScheme="teal" onClick={onOpenLimitBuy} size="sm" variant="outline" borderRadius="2xl">
              {isBuy ? "Limit Buy" : "Limit Sell"}
            </Button>
            <Button colorScheme="teal" onClick={onOpenMarketBuy} size="sm" variant="outline" borderRadius="2xl">
              {isBuy ? "Buy Now" : "Sell Now"}
            </Button>
          </Stack>
        </Box>
      </Flex>
      <Modal  motionPreset="slideInBottom" size={"sm"} isOpen={isOpenLimitBuy}  onClose={onCloseLimitBuy}>
        <ModalOverlay />
        <ModalContent fontFamily="Montserrat" borderRadius="2xl">
          <ModalCloseButton />
          <ModalHeader borderBottomWidth="1px">Order Details</ModalHeader>
          <ModalBody>
            <Stack spacing="24px">
              <Box mt={2} mb={8}>
                <HStack spacing={3}>
                  <Tooltip label="Strike price for this optoin is $2000" bg="gray.300" color="gray.800">
                    <Tag colorScheme="yellow">
                      <Icon as={CgDollar} />
                      <TagLabel>{formattedStrike}</TagLabel>
                    </Tag>
                  </Tooltip>
                  <Tooltip label="This option expires on Jul 15" bg="gray.300" color="gray.800">
                    <Tag colorScheme="blue">
                      <Icon as={MdDateRange} />
                      <TagLabel> {formattedExpiry}</TagLabel>
                    </Tag>
                  </Tooltip>
                </HStack>
              </Box>
              <Box>
                <HStack {...groupOptionType}>
                  <FormLabel htmlFor="optionType">Option Type:</FormLabel>
                  {radioOptionsType.map((value) => {
                    const radio = getOptionTypeRadioProps({ value });
                    return (
                      <RadioCard key={value} {...radio}>
                        {value}
                      </RadioCard>
                    );
                  })}
                </HStack>
              </Box>
              <Box>
                <HStack>
                  <Divider orientation="horizontal" mb={3} mt={3} />
                </HStack>
              </Box>
              <Box>
                <HStack {...groupOption}>
                  <FormLabel htmlFor="option">Option:</FormLabel>
                  {radioOptions.map((value) => {
                    const radio = getOptionRadioProps({ value });
                    return (
                      <RadioCard key={value} {...radio}>
                        {value}
                      </RadioCard>
                    );
                  })}
                </HStack>
              </Box>
              <Box>
                <FormLabel htmlFor="amount">Amount:</FormLabel>
                <Input
                  id="amount"
                  placeholder="0"
                  value={amount}
                  onChange={(event: any) => setAmount(event.target.value)}
                />
              </Box>
              <Box>
                <FormLabel htmlFor="bid">Price:</FormLabel>
                <Input
                  id="bid"
                  placeholder="What will you pay?"
                  value={price}
                  onChange={(event: any) => setPrice(event.target.value)}
                />
              </Box>

            <Box>
              <Flex justifyContent="flex-end">
              <Button
                  colorScheme="teal"
                  type="submit"
                  onClick={placeOrder}
                  isLoading={submitting}
                  loadingText="Placing Order"
              >
                Place Order
              </Button>
              </Flex>
            </Box>
            </Stack>
          </ModalBody>

        </ModalContent>
      </Modal>

      <Modal  motionPreset="slideInBottom" size={"md"} isOpen={isOpenMarketBuy} onClose={onCloseMarketBuy}>
        <ModalOverlay />
        <ModalContent fontFamily="Montserrat" borderRadius="xl">
          <ModalCloseButton />
          <ModalHeader borderBottomWidth="1px" fontSize="14px" fontWeight="bold">
            Order Details
          </ModalHeader>
          <ModalBody>
            <Stack spacing="24px">
              <Box mt={2} mb={8}>
                <HStack spacing={3}>
                  <Tooltip label="Option" bg="gray.300" color="gray.800">
                    <Tag colorScheme="pink">
                      <Icon as={GiTakeMyMoney} />
                      <TagLabel>{isBuy? "BUY" : "SELL"}</TagLabel>
                    </Tag>
                  </Tooltip>
                    <Tooltip label="Option Type" bg="gray.300" color="gray.800">
                    <Tag colorScheme="purple">
                      <Icon as={GiSwordBrandish}/>
                      <TagLabel>{isCall? "CALL" : "PUT"}</TagLabel>
                    </Tag>
                    </Tooltip>
                  <Tooltip label="Strike price for this optoin is $2000" bg="gray.300" color="gray.800">
                  <Tag colorScheme="yellow">
                    <Icon as={CgDollar} />
                    <TagLabel>{strikePrice}</TagLabel>
                  </Tag>
                  </Tooltip>
                  <Tooltip label="This option expires on Jul 15" bg="gray.300" color="gray.800">
                  <Tag colorScheme="blue">
                    <Icon as={MdDateRange} />
                    <TagLabel> {expiryDate}</TagLabel>
                  </Tag>
                  </Tooltip>
                </HStack>
              </Box>
              <Box>
                <FormLabel htmlFor="amount">Amount:</FormLabel>
                <Input
                    id="amount"
                    placeholder="0"
                    value={amount}
                    onChange={(event: any) => setAmount(event.target.value)}
                />
              </Box>
              <Box>
                <FormLabel htmlFor="amount">Total Price:</FormLabel>
                <Input
                    id="amount"
                    placeholder="0"
                    value={amount}
                    onChange={(event: any) => setAmount(event.target.value)}
                />
              </Box>
              <Box>
                <FormLabel htmlFor="bid">Unit Price:</FormLabel>
                <Input
                    id="bid"
                    placeholder="0"
                    value={price}
                    onChange={(event: any) => setPrice(event.target.value)}
                />
              </Box>
              <Box>
                <Flex justifyContent="flex-end">
                <Button
                    colorScheme="teal"
                    type="submit"
                    onClick={placeOrder}
                    isLoading={submitting}
                    loadingText="Placing Order"
                >
                  Place Order
                </Button>
              </Flex>

              </Box>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default OptionRow;
