import type {
  GetServerSideProps,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { getFreeWorkJobs } from "./api/cron";

const Home: NextPage<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ data }) => {
  return (
    <div className="grid h-screen place-items-center">
      <h1 className="text-5xl font-black">Satoshi</h1>
      <h2 className="text-2xl font-black">
        Total results: {data["hydra:totalItems"]}
      </h2>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  const data = await getFreeWorkJobs();

  return {
    props: {
      data,
    },
  };
};

export default Home;
