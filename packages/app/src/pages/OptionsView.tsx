import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Container,
  Grid,
  HStack,
  useRadioGroup
} from '@chakra-ui/react';
import Options from "../components/Options";
import useFetch from "../hooks/useFetch";
import { IOrder, ContractData, OptionType, OptionAction } from '../types';
import { RouteComponentProps } from "@reach/router";
import RadioCard from '../components/Radio';
import { getEnumKeys } from '../utils/helperMethods';
import { Spinner } from "@chakra-ui/react"
import {formatOrder} from "../utils/ethMethods";

function OptionsView(props: RouteComponentProps) {

  const [option, setOption] = useState("BUY");
  const [optionType, setOptionType] = useState("CALL");
  const [expiryDate, setExpiryDate] = useState("");
  const [strikePrices, setStrikePrices] = useState([]);
  const [expiryDates, setExpiryDates] = useState([]);

  const optionRows: any = [];

  const url = `${process.env.REACT_APP_API_ENDPOINT}/orders`;
  // TODO: orderData should handle error just like contract data
  const {data:orderData, status: orderDataStatus} = useFetch<IOrder[]>(url);
  const contractsUrl = `${process.env.REACT_APP_API_ENDPOINT}/contracts`;
  const {error:contractDataError, data: contractData, status: contractDataStatus} = useFetch<ContractData>(contractsUrl);
  const options: string[] = [OptionAction.BUY, OptionAction.SELL]
  const optionTypes: string[] = getEnumKeys(OptionType)


  const {
    getRootProps: getOptionRootProps,
    getRadioProps: getOptionRadioProps,
  } = useRadioGroup({
    name: "option",
    defaultValue: "BUY",
    onChange: (nextValue) => setOption(nextValue),
  })

  const {
    getRootProps: getOptionTypeRootProps,
    getRadioProps: getOptionTypeRadioProps,
  } = useRadioGroup({
    name: "optionType",
    defaultValue:  "CALL",
    onChange: (nextValue) => setOptionType(nextValue),
  });

  const {
    getRootProps: getExpiryRootProps,
    getRadioProps: getExpiryRadioProps,
  } = useRadioGroup({
    name: "expiryDate",
    onChange: (nextValue) => setExpiryDate(nextValue),
  });


  const groupOption = getOptionRootProps();
  const groupOptionType = getOptionTypeRootProps();
  const groupExpiry = getExpiryRootProps();



  useEffect(() => {

      if (contractData && contractDataStatus === "fetched" && !contractDataError) {
        // @ts-ignore
        const expiryDatesLocal = Object.keys(contractData["ETH-FK"]);
        // @ts-ignore
        setExpiryDates(expiryDatesLocal);
        if(!expiryDate) {
          setExpiryDate(expiryDatesLocal[0])
        }
      }
      }, [contractDataStatus]

  );


  useEffect(() => {
    if(expiryDate) {
      // @ts-ignore
      setStrikePrices(contractData["ETH-FK"][expiryDate][optionType]);
    }

  },[expiryDate, optionType]);

  const formattedOrderData = useMemo(() => {
    return orderData && orderData.map(order => formatOrder(order));
  }, [orderData])

  for (const strikePrice of strikePrices) {

    const filteredOrders =
        formattedOrderData &&
        orderDataStatus === "fetched"
        && formattedOrderData.filter((order) =>
        order.formattedStrike === strikePrice && order.optionType === OptionType[optionType as keyof typeof OptionType]
    );

    const buyOrders =
      filteredOrders &&
      filteredOrders.filter((filteredOrder) => filteredOrder.isBuy);

    const sellOrders =
      filteredOrders &&
      filteredOrders.filter((filteredOrder) => !filteredOrder.isBuy);

    const bestBid =
      buyOrders &&
      buyOrders.length &&
      Math.max(...buyOrders.map((buyOrder) => buyOrder.formattedPrice));

    const bestAsk =
      sellOrders &&
      sellOrders.length &&
      Math.min(...sellOrders.map((buyOrder) => buyOrder.formattedPrice));

    optionRows.push(
      <Options
        key={strikePrice}
        strikePrice={strikePrice}
        bid={bestBid}
        ask={bestAsk}
        isBuy={option === "BUY"}
        isCall={optionType === "CALL"}
        setOption={setOption}
        setOptionType={setOptionType}
      />
    );
  }

  return (
    <Container
      mt={100}
      p={5}
      shadow="md"
      borderWidth="1px"
      flex="1"
      borderRadius="lg"
    >
      {contractDataStatus === "fetching" &&
      <Spinner color="teal"/>
      }
      {contractDataError &&
      <Box>
        <Alert status="error" borderRadius={9}>
          <AlertIcon />
          <AlertDescription>{contractDataError}</AlertDescription>
        </Alert>
      </Box>
      }
      <Box mb={10}>
        <HStack {...groupExpiry}>
          {expiryDates.map((value) => {
            const radio = getExpiryRadioProps({ value });
            return (
                <RadioCard key={value} {...radio}>
                  {value}
                </RadioCard>
            );
          })}
        </HStack>
      </Box>
      {!contractDataError &&
      <Grid pb={"5"} templateColumns="repeat(2, 1fr)">
        <HStack {...groupOption}>
          {options.map((value) => {
            const radio = getOptionRadioProps({ value });
            return (
                <RadioCard key={value} {...radio}>
                  {value}
                </RadioCard>
            );
          })}
        </HStack>

        <HStack {...groupOptionType}>
          {optionTypes.map((value) => {
            const radio = getOptionTypeRadioProps({ value });
            return (
                <RadioCard key={value} {...radio}>
                  {value}
                </RadioCard>
            );
          })}
        </HStack>
      </Grid>
      }
      {optionRows}
    </Container>
  );
}

export default OptionsView;
