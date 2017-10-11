import { expect, use } from "chai";
import "mocha";
import * as sinonChai from "sinon-chai";

import { cli } from "../lib/cli/cli";
import { ExitCode, IMainDependencies } from "../lib/main";
import { stubLogger } from "./stubs";

use(sinonChai);

interface IGlobExpansions {
    [i: string]: string[];
}

describe("CLI", () => {
    const stubGlobber = (globExpansions: IGlobExpansions) =>
        async (patterns: string[]) => {
            const results = [];

            for (const pattern of patterns) {
                if (pattern in globExpansions) {
                    results.push(...globExpansions[pattern]);
                } else {
                    throw new Error(`Unknown glob pattern: '${pattern}'.`);
                }
            }

            return results;
        };

    const stubMainDependencies = (
        extraArgv: string[], globExpansions: IGlobExpansions, innerMain: (dependencies: IMainDependencies) => void) => {
        const argv = ["node", "gls-cli", "--language", "Java", ...extraArgv];
        const globber = stubGlobber(globExpansions);
        const logger = stubLogger();

        const main = async (mainArgs: IMainDependencies) => {
            innerMain(mainArgs);
            return ExitCode.Ok;
        };

        return { argv, globber, logger, main };
    };

    describe("files", () => {
        it("includes a provided file", async () => {
            // Arrange
            const stubFileName = "file.gls";
            const dependencies = stubMainDependencies(
                [stubFileName],
                {
                    [stubFileName]: [stubFileName],
                },
                (mainArgs: IMainDependencies) => {
                    // Assert
                    const actualFiles = Array.from(mainArgs.files);

                    expect(actualFiles).to.be.deep.equal([stubFileName]);
                });

            // Act
            await cli(dependencies);
        });

        it("expands matches from a globber", async () => {
            // Arrange
            const stubExpander = "*.gls";
            const stubFileNames = ["a.gls", "b.gls"];
            const dependencies = stubMainDependencies(
                [stubExpander],
                {
                    [stubExpander]: stubFileNames,
                },
                (mainArgs: IMainDependencies) => {
                    // Assert
                    const actualFiles = Array.from(mainArgs.files);

                    expect(actualFiles).to.be.deep.equal(stubFileNames);
                });

            // Act
            await cli(dependencies);
        });

        it("removes an exclude from included files", async () => {
            // Arrange
            const stubExpander = "*.gls";
            const stubFileNames = ["a.gls", "b.gls"];
            const dependencies = stubMainDependencies(
                [stubExpander, "--exclude", stubFileNames[0]],
                {
                    [stubFileNames[0]]: [stubFileNames[0]],
                    [stubFileNames[1]]: [stubFileNames[1]],
                    [stubExpander]: stubFileNames,
                },
                (mainArgs: IMainDependencies) => {
                    // Assert
                    const actualFiles = Array.from(mainArgs.files);

                    expect(actualFiles).to.be.deep.equal([stubFileNames[1]]);
                });

            // Act
            await cli(dependencies);
        });
    });
});
