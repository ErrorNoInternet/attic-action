import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { saveStorePaths } from "../utils";

export const configure = async () => {
	core.startGroup("Configure attic");

	try {
		const endpoint = core.getInput("endpoint");
		const cache = core.getInput("cache");
		const token = core.getInput("token");
		const skipUse = core.getInput("skip-use");

		core.info("Logging in to attic cache");
		await exec("attic", ["login", "--set-default", cache, endpoint, token]);

		if (skipUse === "true") {
			core.info("Not adding attic cache to substituters as skip-use is set to true");
		} else {
			core.info("Adding attic cache to substituters");
			await execWithRetry("attic", ["use", cache]);
		}

		core.info("Collecting store paths before build");
		await saveStorePaths();
	} catch (e) {
		core.setFailed(`Action failed with error: ${e}`);
	}

	core.endGroup();
};

const execWithRetry = async (command: string, args: string[], retries: number = 1000) => {
    try {
        await exec(command, args);
    } catch (error) {
        core.error(`Execution of ${command} failed with error: ${error}`);
        if (retries > 0) {
            core.info(`Retrying execution of ${command} (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await execWithRetry(command, args, retries - 1);
        } else {
            throw new Error(`Failed to execute ${command} after multiple retries`);
        }
    }
};
