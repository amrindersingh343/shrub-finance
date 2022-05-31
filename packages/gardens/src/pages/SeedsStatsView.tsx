import { useQuery, gql } from "@apollo/client";
import {
  Button,
  useColorModeValue,
  Th,
  Tr,
  Td,
  Tbody,
  Thead,
  TableCaption,
  Link,
  Table,
  Spinner,
} from "@chakra-ui/react";
import { RouteComponentProps } from "@reach/router";
import React, { useEffect } from "react";

let treasuryHopeSeeds: number;
let treasuryWonderSeeds: number;
let treasuryPassionSeeds: number;
let treasuryPowerSeeds: number;
let circulationPowerSeed: number;
let circulationWonderSeed: number;
let circulationHopeSeed: number;
let circulationPassionSeed: number;

function SeedsStatsView(props: RouteComponentProps) {
  const seedsType = ["Passion", "Hope", "Power"];
  const power = "Power";
  const passion = "Passion";
  const hope = "Hope";
  const id = "0xbcfe78a91b6968322ed1b08fbe3a081353487910";
  const treasurySeeds: number[] = [];
  let totalSeedsTreasury;
  const transState = [];

  const getSeeds = gql`
    query GetData($seedtype: string) {
      seeds(where: { type: $seedtype }) {
        name
      }
    }
  `;
  const totalSeedsInTreasury = gql`
    query MyQuery {
      users(where: { id: "0xbcfe78a91b6968322ed1b08fbe3a081353487910" }) {
        seedCount
      }
    }
  `;
  const seedsTypeTreasury = gql`
    query MyQuery($id: String, $value: String) {
      users(where: { id: $id }) {
        seeds(where: { type: $value }, first: 1000) {
          type
        }
      }
    }
  `;

  const seeds = gql`
    query MyQuery {
      users(where: { id: "0xbcfe78a91b6968322ed1b08fbe3a081353487910" }) {
        seeds {
          type
          name
        }
      }
    }
  `;

  const seedsClaim = gql`
    query MyQuery {
      typeStats {
        id
        claimed
      }
    }
  `;

  const bg = useColorModeValue("sprout", "teal");
  const data1 = useQuery(totalSeedsInTreasury, { variables: { type: hope } });
  const claimedSeeds = useQuery(seedsClaim);
  const totalSeedsShrubTeasury = data1?.data?.users[0]?.seedCount;
  for (let i = 0; i < seedsType.length; i++) {
    const data2 = useQuery(seedsTypeTreasury, {
      variables: {
        id: "0xbcfe78a91b6968322ed1b08fbe3a081353487910",
        value: seedsType[i],
      },
    });
    if (data2.data) {
      switch (seedsType[i]) {
        case "Passion":
          treasuryPassionSeeds = data2.data.users[0].seeds.length;
          break;
        case "Hope":
          treasuryHopeSeeds = data2.data.users[0].seeds.length;
          break;
        case "Power":
          treasuryPowerSeeds = data2.data.users[0].seeds.length;
      }
    }
  }
  if (data1?.data?.users[0]?.seedCount) {
    const counter =
      treasuryHopeSeeds + treasuryPassionSeeds + treasuryPowerSeeds;
    treasuryWonderSeeds = totalSeedsShrubTeasury - counter;
  }

  if (claimedSeeds?.data?.typeStats?.length) {
    for (let i = 0; i < claimedSeeds.data.typeStats.length; i++) {
      transState.push(claimedSeeds.data.typeStats[i]);
      switch (claimedSeeds.data.typeStats[i].id) {
        case "Passion":
          circulationPassionSeed =
            claimedSeeds.data.typeStats[i].claimed - treasuryPassionSeeds;
          break;

        case "Hope":
          circulationHopeSeed =
            claimedSeeds.data.typeStats[i].claimed - treasuryHopeSeeds;
          break;

        case "Power":
          circulationPowerSeed =
            claimedSeeds.data.typeStats[i].claimed - treasuryPowerSeeds;
          break;

        case "Wonder":
          circulationWonderSeed =
            claimedSeeds.data.typeStats[i].claimed - treasuryWonderSeeds;
          break;
      }
    }
  }
  return (
    <>
      <Table
        variant="simple"
        size="sm"
        width={200}
        height={100}
        mt={100}
        ml={500}
      >
        <Thead>
          <Tr>
            <Th>SeedPosition</Th>
            <Th>Passion</Th>
            <Th>Hope</Th>
            <Th>Power</Th>
            <Th>Wonder</Th>
            <Th>Total</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Seeds in treasury</Td>
            <Td>{treasuryPassionSeeds}</Td>
            <Td>{treasuryHopeSeeds}</Td>
            <Td>{treasuryPowerSeeds}</Td>
            <Td>{treasuryWonderSeeds}</Td>
            <Td>{totalSeedsShrubTeasury}</Td>
          </Tr>
          <Tr>
            <Td>Seeds in Circulation</Td>
            <Td>{circulationPassionSeed}</Td>
            <Td>{circulationHopeSeed}</Td>
            <Td>{circulationPowerSeed}</Td>
            <Td>{circulationWonderSeed}</Td>
            <Td>
              {circulationPassionSeed +
                circulationHopeSeed +
                circulationPowerSeed +
                circulationWonderSeed}
            </Td>
          </Tr>
          <Tr>
            <Td>Total Seeds</Td>
            <Td>{circulationPassionSeed + treasuryPassionSeeds}</Td>
            <Td>{circulationHopeSeed + treasuryHopeSeeds}</Td>
            <Td>{circulationPowerSeed + treasuryPowerSeeds}</Td>
            <Td>{circulationWonderSeed + treasuryWonderSeeds}</Td>
            <Td>
              {circulationPassionSeed +
                treasuryPassionSeeds +
                circulationWonderSeed +
                treasuryWonderSeeds +
                circulationPowerSeed +
                treasuryPowerSeeds +
                circulationHopeSeed +
                treasuryHopeSeeds}
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </>
  );
}
export default SeedsStatsView;
